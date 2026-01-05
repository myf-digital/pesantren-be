import { User } from "../../src/module/app/user/user.model"; // Adjust path if needed
declare global {
  namespace Express {
    interface Request {
      user?: any; // Change any to your User interface if available
    }
  }
}

