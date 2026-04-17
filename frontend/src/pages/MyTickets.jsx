import React from "react";
import { useLocation } from "react-router-dom";
import Tickets from "./Tickets";

export default function MyTickets() {
  // Simply renders Tickets with employee scoping
  return <Tickets employeeView />;
}
