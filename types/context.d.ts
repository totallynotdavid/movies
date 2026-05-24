import "void";
import type { UserRole } from "../src/domain/library";

declare module "void" {
  interface CloudContextVariables {
    role: UserRole;
  }
}
