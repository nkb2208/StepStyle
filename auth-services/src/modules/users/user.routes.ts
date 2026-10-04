import { Router } from "express";
import { authenticate } from "../../middleware/authenticate";
import { authorizePermission, authorizeRole } from "../authorization/authorization.middleware";
import { UserController } from "./user.controller";

const router = Router();

router.get("/", authenticate, authorizeRole("ADMIN"), UserController.list);
router.post("/", authenticate, authorizePermission("user:create"), UserController.create);
router.patch("/:id", authenticate, authorizePermission("user:update"), UserController.update);
router.delete("/:id", authenticate, authorizePermission("user:delete"), UserController.remove);

export default router;
