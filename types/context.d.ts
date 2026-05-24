import "void";
import type { UserRole } from "../src/domain/library";

declare module "void" {
  interface CloudContextVariables {
    role: UserRole;
    shared: {
      user: { id: string; name: string; email: string } | null;
      role: UserRole;
    };
  }
}
