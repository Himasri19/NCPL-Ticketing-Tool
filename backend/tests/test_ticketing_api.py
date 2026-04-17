"""
NCPL Ticketing Tool - Backend API Tests
Tests: Auth, Departments, Tickets CRUD, Comments, Attachments, Dashboard, Employees, RBAC
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
ADMIN_TOKEN = "test_admin_session"
EMPLOYEE_TOKEN = None  # Will be created during tests

# Test data tracking for cleanup
created_tickets = []
created_departments = []


@pytest.fixture(scope="module")
def admin_client():
    """Admin session client"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {ADMIN_TOKEN}"
    })
    return session


@pytest.fixture(scope="module")
def employee_session():
    """Create employee user and session for RBAC testing"""
    import subprocess
    # Create employee user and session in MongoDB
    result = subprocess.run([
        "mongosh", "test_database", "--eval", """
        var userId = 'test-employee-' + Date.now();
        var sessionToken = 'test_employee_session_' + Date.now();
        db.users.insertOne({
            user_id: userId,
            email: 'test.employee@example.com',
            name: 'Test Employee',
            role: 'employee',
            department: null,
            picture: null,
            created_at: new Date().toISOString()
        });
        db.user_sessions.insertOne({
            session_token: sessionToken,
            user_id: userId,
            expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
            created_at: new Date().toISOString()
        });
        print('TOKEN:' + sessionToken);
        print('USERID:' + userId);
        """
    ], capture_output=True, text=True)
    
    output = result.stdout
    token = None
    user_id = None
    for line in output.split('\n'):
        if line.startswith('TOKEN:'):
            token = line.replace('TOKEN:', '').strip()
        if line.startswith('USERID:'):
            user_id = line.replace('USERID:', '').strip()
    
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}"
    })
    
    yield {"session": session, "token": token, "user_id": user_id}
    
    # Cleanup
    subprocess.run([
        "mongosh", "test_database", "--eval", f"""
        db.users.deleteOne({{user_id: '{user_id}'}});
        db.user_sessions.deleteOne({{session_token: '{token}'}});
        """
    ], capture_output=True)


class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_endpoint(self, admin_client):
        """Test API health endpoint"""
        response = admin_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["service"] == "NCPL Ticketing"
        assert data["status"] == "ok"
        print("✓ Health endpoint working")
    
    def test_auth_me_admin(self, admin_client):
        """Test /api/auth/me returns admin user"""
        response = admin_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "admin"
        assert data["email"] == "himasri.yellapu@ncplconsulting.net"
        assert "user_id" in data
        print(f"✓ Auth/me returns admin: {data['name']}")
    
    def test_auth_me_without_token(self):
        """Test /api/auth/me without token returns 401"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Auth/me without token returns 401")


class TestDepartments:
    """Department CRUD tests"""
    
    def test_list_departments(self, admin_client):
        """Test GET /api/departments returns seeded departments"""
        response = admin_client.get(f"{BASE_URL}/api/departments")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 6  # 6 seeded departments
        dept_names = [d["name"] for d in data]
        for expected in ["HR", "Sales", "Training", "Mentoring", "Finance", "Hrudai"]:
            assert expected in dept_names, f"Missing seeded department: {expected}"
        print(f"✓ Listed {len(data)} departments including all 6 seeded")
    
    def test_create_department_admin(self, admin_client):
        """Test POST /api/departments (admin only)"""
        response = admin_client.post(f"{BASE_URL}/api/departments", json={
            "name": "TEST_IT_Support",
            "description": "IT Support department for testing"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_IT_Support"
        assert "id" in data
        created_departments.append(data["id"])
        print(f"✓ Created department: {data['name']}")
    
    def test_create_duplicate_department(self, admin_client):
        """Test creating duplicate department returns 400"""
        response = admin_client.post(f"{BASE_URL}/api/departments", json={
            "name": "HR",  # Already exists
            "description": "Duplicate"
        })
        assert response.status_code == 400
        print("✓ Duplicate department creation blocked")
    
    def test_update_department_admin(self, admin_client):
        """Test PATCH /api/departments/{id}"""
        if not created_departments:
            pytest.skip("No test department created")
        dept_id = created_departments[0]
        response = admin_client.patch(f"{BASE_URL}/api/departments/{dept_id}", json={
            "name": "TEST_IT_Support",
            "description": "Updated description"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "Updated description"
        print("✓ Updated department description")
    
    def test_delete_department_admin(self, admin_client):
        """Test DELETE /api/departments/{id}"""
        if not created_departments:
            pytest.skip("No test department created")
        dept_id = created_departments.pop()
        response = admin_client.delete(f"{BASE_URL}/api/departments/{dept_id}")
        assert response.status_code == 200
        print("✓ Deleted test department")


class TestDepartmentsRBAC:
    """Department RBAC tests - employee restrictions"""
    
    def test_employee_can_list_departments(self, employee_session):
        """Employees can list departments"""
        response = employee_session["session"].get(f"{BASE_URL}/api/departments")
        assert response.status_code == 200
        print("✓ Employee can list departments")
    
    def test_employee_cannot_create_department(self, employee_session):
        """Employees cannot create departments"""
        response = employee_session["session"].post(f"{BASE_URL}/api/departments", json={
            "name": "TEST_Unauthorized",
            "description": "Should fail"
        })
        assert response.status_code == 403
        print("✓ Employee blocked from creating department (403)")
    
    def test_employee_cannot_delete_department(self, employee_session, admin_client):
        """Employees cannot delete departments"""
        # Get a department ID
        depts = admin_client.get(f"{BASE_URL}/api/departments").json()
        if depts:
            response = employee_session["session"].delete(f"{BASE_URL}/api/departments/{depts[0]['id']}")
            assert response.status_code == 403
            print("✓ Employee blocked from deleting department (403)")


class TestTicketsCRUD:
    """Ticket CRUD operations"""
    
    def test_create_ticket_admin(self, admin_client):
        """Test POST /api/tickets creates ticket with NCP-XXXX code"""
        response = admin_client.post(f"{BASE_URL}/api/tickets", json={
            "title": "TEST_Admin Ticket",
            "description": "Test ticket created by admin",
            "department": "HR",
            "priority": "High"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "TEST_Admin Ticket"
        assert data["code"].startswith("NCP-")
        assert data["status"] == "Open"
        assert data["priority"] == "High"
        assert data["department"] == "HR"
        created_tickets.append(data["id"])
        print(f"✓ Created ticket: {data['code']}")
        return data
    
    def test_list_tickets_admin(self, admin_client):
        """Test GET /api/tickets returns all tickets for admin"""
        response = admin_client.get(f"{BASE_URL}/api/tickets")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} tickets")
    
    def test_get_ticket_by_id(self, admin_client):
        """Test GET /api/tickets/{id}"""
        if not created_tickets:
            pytest.skip("No test ticket created")
        ticket_id = created_tickets[0]
        response = admin_client.get(f"{BASE_URL}/api/tickets/{ticket_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == ticket_id
        print(f"✓ Retrieved ticket: {data['code']}")
    
    def test_update_ticket_admin(self, admin_client):
        """Test PATCH /api/tickets/{id}"""
        if not created_tickets:
            pytest.skip("No test ticket created")
        ticket_id = created_tickets[0]
        response = admin_client.patch(f"{BASE_URL}/api/tickets/{ticket_id}", json={
            "priority": "Urgent",
            "description": "Updated description"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["priority"] == "Urgent"
        print("✓ Updated ticket priority to Urgent")
    
    def test_ticket_filters(self, admin_client):
        """Test ticket filtering by status, department, priority"""
        # Filter by status
        response = admin_client.get(f"{BASE_URL}/api/tickets", params={"status": "Open"})
        assert response.status_code == 200
        
        # Filter by department
        response = admin_client.get(f"{BASE_URL}/api/tickets", params={"department": "HR"})
        assert response.status_code == 200
        
        # Filter by scope
        response = admin_client.get(f"{BASE_URL}/api/tickets", params={"scope": "active"})
        assert response.status_code == 200
        
        # Search
        response = admin_client.get(f"{BASE_URL}/api/tickets", params={"q": "TEST"})
        assert response.status_code == 200
        
        print("✓ Ticket filters working")


class TestTicketAssignment:
    """Ticket assignment and status change tests"""
    
    def test_assign_ticket(self, admin_client):
        """Test POST /api/tickets/{id}/assign"""
        if not created_tickets:
            pytest.skip("No test ticket created")
        ticket_id = created_tickets[0]
        
        # Get assignable employees
        employees = admin_client.get(f"{BASE_URL}/api/employees/assignable").json()
        if not employees:
            pytest.skip("No employees to assign")
        
        assignee_id = employees[0]["user_id"]
        response = admin_client.post(f"{BASE_URL}/api/tickets/{ticket_id}/assign", json={
            "assignee_id": assignee_id
        })
        assert response.status_code == 200
        data = response.json()
        assert data["assignee_id"] == assignee_id
        # Status should change to In Progress when assigned
        assert data["status"] in ["Open", "In Progress"]
        print(f"✓ Assigned ticket to {data['assignee_name']}")
    
    def test_change_ticket_status(self, admin_client):
        """Test POST /api/tickets/{id}/status"""
        if not created_tickets:
            pytest.skip("No test ticket created")
        ticket_id = created_tickets[0]
        
        response = admin_client.post(f"{BASE_URL}/api/tickets/{ticket_id}/status", json={
            "status": "Pending"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "Pending"
        print("✓ Changed ticket status to Pending")
    
    def test_escalate_ticket(self, admin_client):
        """Test POST /api/tickets/{id}/escalate"""
        if not created_tickets:
            pytest.skip("No test ticket created")
        ticket_id = created_tickets[0]
        
        response = admin_client.post(f"{BASE_URL}/api/tickets/{ticket_id}/escalate")
        assert response.status_code == 200
        data = response.json()
        assert data["is_escalated"] == True
        print("✓ Escalated ticket")


class TestTicketsRBAC:
    """Ticket RBAC tests - employee restrictions"""
    
    def test_employee_create_ticket(self, employee_session):
        """Employee can create ticket"""
        response = employee_session["session"].post(f"{BASE_URL}/api/tickets", json={
            "title": "TEST_Employee Ticket",
            "description": "Test ticket created by employee",
            "department": "Sales",
            "priority": "Medium"
        })
        assert response.status_code == 200
        data = response.json()
        created_tickets.append(data["id"])
        print(f"✓ Employee created ticket: {data['code']}")
        return data
    
    def test_employee_sees_only_own_tickets(self, employee_session, admin_client):
        """Employee only sees their own tickets"""
        # Employee list
        emp_response = employee_session["session"].get(f"{BASE_URL}/api/tickets")
        assert emp_response.status_code == 200
        emp_tickets = emp_response.json()
        
        # Admin list (should have more)
        admin_response = admin_client.get(f"{BASE_URL}/api/tickets")
        admin_tickets = admin_response.json()
        
        # Employee should see fewer or equal tickets
        assert len(emp_tickets) <= len(admin_tickets)
        
        # All employee tickets should be created by them
        for t in emp_tickets:
            assert t["created_by"] == employee_session["user_id"]
        
        print(f"✓ Employee sees {len(emp_tickets)} own tickets, admin sees {len(admin_tickets)}")
    
    def test_employee_cannot_assign_ticket(self, employee_session, admin_client):
        """Employee cannot assign tickets"""
        # Get admin's ticket
        admin_tickets = admin_client.get(f"{BASE_URL}/api/tickets").json()
        admin_ticket = next((t for t in admin_tickets if "TEST_Admin" in t.get("title", "")), None)
        
        if admin_ticket:
            response = employee_session["session"].post(
                f"{BASE_URL}/api/tickets/{admin_ticket['id']}/assign",
                json={"assignee_id": employee_session["user_id"]}
            )
            assert response.status_code == 403
            print("✓ Employee blocked from assigning tickets (403)")
    
    def test_employee_cannot_escalate(self, employee_session):
        """Employee cannot escalate tickets"""
        emp_tickets = employee_session["session"].get(f"{BASE_URL}/api/tickets").json()
        if emp_tickets:
            response = employee_session["session"].post(
                f"{BASE_URL}/api/tickets/{emp_tickets[0]['id']}/escalate"
            )
            assert response.status_code == 403
            print("✓ Employee blocked from escalating (403)")


class TestComments:
    """Comment tests including internal notes"""
    
    def test_add_comment(self, admin_client):
        """Test POST /api/tickets/{id}/comments"""
        if not created_tickets:
            pytest.skip("No test ticket created")
        ticket_id = created_tickets[0]
        
        response = admin_client.post(f"{BASE_URL}/api/tickets/{ticket_id}/comments", json={
            "body": "TEST_Public comment from admin",
            "is_internal": False
        })
        assert response.status_code == 200
        data = response.json()
        assert data["body"] == "TEST_Public comment from admin"
        assert data["is_internal"] == False
        print("✓ Added public comment")
    
    def test_add_internal_comment_admin(self, admin_client):
        """Test internal comment (admin only)"""
        if not created_tickets:
            pytest.skip("No test ticket created")
        ticket_id = created_tickets[0]
        
        response = admin_client.post(f"{BASE_URL}/api/tickets/{ticket_id}/comments", json={
            "body": "TEST_Internal note - hidden from requester",
            "is_internal": True
        })
        assert response.status_code == 200
        data = response.json()
        assert data["is_internal"] == True
        print("✓ Added internal comment")
    
    def test_list_comments(self, admin_client):
        """Test GET /api/tickets/{id}/comments"""
        if not created_tickets:
            pytest.skip("No test ticket created")
        ticket_id = created_tickets[0]
        
        response = admin_client.get(f"{BASE_URL}/api/tickets/{ticket_id}/comments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Admin should see internal comments
        internal_comments = [c for c in data if c.get("is_internal")]
        print(f"✓ Listed {len(data)} comments ({len(internal_comments)} internal)")
    
    def test_employee_cannot_see_internal_comments(self, employee_session, admin_client):
        """Employee should not see internal comments"""
        # Find employee's ticket
        emp_tickets = employee_session["session"].get(f"{BASE_URL}/api/tickets").json()
        if not emp_tickets:
            pytest.skip("No employee tickets")
        
        ticket_id = emp_tickets[0]["id"]
        
        # Admin adds internal comment
        admin_client.post(f"{BASE_URL}/api/tickets/{ticket_id}/comments", json={
            "body": "TEST_Secret internal note",
            "is_internal": True
        })
        
        # Employee fetches comments
        response = employee_session["session"].get(f"{BASE_URL}/api/tickets/{ticket_id}/comments")
        assert response.status_code == 200
        comments = response.json()
        
        # No internal comments should be visible
        internal = [c for c in comments if c.get("is_internal")]
        assert len(internal) == 0, "Employee should not see internal comments"
        print("✓ Employee cannot see internal comments")


class TestEmployees:
    """Employee management tests"""
    
    def test_list_employees_admin(self, admin_client):
        """Test GET /api/employees (admin only)"""
        response = admin_client.get(f"{BASE_URL}/api/employees")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least admin user
        print(f"✓ Listed {len(data)} employees")
    
    def test_employee_cannot_list_employees(self, employee_session):
        """Employee cannot access /api/employees"""
        response = employee_session["session"].get(f"{BASE_URL}/api/employees")
        assert response.status_code == 403
        print("✓ Employee blocked from listing employees (403)")
    
    def test_assignable_employees(self, admin_client):
        """Test GET /api/employees/assignable"""
        response = admin_client.get(f"{BASE_URL}/api/employees/assignable")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} assignable employees")
    
    def test_update_employee_role(self, admin_client, employee_session):
        """Test PATCH /api/employees/{id} to change role"""
        user_id = employee_session["user_id"]
        
        # Change department
        response = admin_client.patch(f"{BASE_URL}/api/employees/{user_id}", json={
            "department": "HR"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["department"] == "HR"
        print("✓ Updated employee department")


class TestDashboard:
    """Dashboard stats tests"""
    
    def test_dashboard_stats_admin(self, admin_client):
        """Test GET /api/dashboard/stats returns all metrics"""
        response = admin_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Check all required fields
        required_fields = [
            "total", "active", "unassigned", "resolved", "closed",
            "high_priority", "escalated", "by_status", "by_department",
            "by_priority", "trend_7d"
        ]
        for field in required_fields:
            assert field in data, f"Missing field: {field}"
        
        # Validate structure
        assert isinstance(data["by_status"], list)
        assert isinstance(data["by_department"], list)
        assert isinstance(data["by_priority"], list)
        assert isinstance(data["trend_7d"], list)
        
        print(f"✓ Dashboard stats: total={data['total']}, active={data['active']}, escalated={data['escalated']}")
    
    def test_dashboard_stats_employee_scoped(self, employee_session):
        """Employee dashboard stats should be scoped to their tickets"""
        response = employee_session["session"].get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Employee should see their own stats
        assert "total" in data
        print(f"✓ Employee dashboard stats: total={data['total']}")


class TestAttachments:
    """Attachment upload/download tests"""
    
    def test_upload_attachment(self, admin_client):
        """Test POST /api/tickets/{id}/attachments"""
        if not created_tickets:
            pytest.skip("No test ticket created")
        ticket_id = created_tickets[0]
        
        # Create a test file
        files = {
            "file": ("test_file.txt", b"Test file content for attachment", "text/plain")
        }
        
        # Remove Content-Type header for multipart
        headers = {"Authorization": f"Bearer {ADMIN_TOKEN}"}
        response = requests.post(
            f"{BASE_URL}/api/tickets/{ticket_id}/attachments",
            files=files,
            headers=headers
        )
        assert response.status_code == 200
        data = response.json()
        assert data["filename"] == "test_file.txt"
        assert "id" in data
        print(f"✓ Uploaded attachment: {data['filename']}")
        return data
    
    def test_list_attachments(self, admin_client):
        """Test GET /api/tickets/{id}/attachments"""
        if not created_tickets:
            pytest.skip("No test ticket created")
        ticket_id = created_tickets[0]
        
        response = admin_client.get(f"{BASE_URL}/api/tickets/{ticket_id}/attachments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Listed {len(data)} attachments")
        return data
    
    def test_download_attachment(self, admin_client):
        """Test GET /api/attachments/{id}/download"""
        if not created_tickets:
            pytest.skip("No test ticket created")
        ticket_id = created_tickets[0]
        
        # Get attachments
        attachments = admin_client.get(f"{BASE_URL}/api/tickets/{ticket_id}/attachments").json()
        if not attachments:
            pytest.skip("No attachments to download")
        
        att_id = attachments[0]["id"]
        response = admin_client.get(f"{BASE_URL}/api/attachments/{att_id}/download")
        assert response.status_code == 200
        print("✓ Downloaded attachment")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_tickets(self, admin_client):
        """Delete test tickets"""
        # Get all tickets with TEST_ prefix
        tickets = admin_client.get(f"{BASE_URL}/api/tickets", params={"q": "TEST_"}).json()
        for t in tickets:
            # Can't delete tickets via API, but we can close them
            admin_client.post(f"{BASE_URL}/api/tickets/{t['id']}/status", json={"status": "Closed"})
        print(f"✓ Closed {len(tickets)} test tickets")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
