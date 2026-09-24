import express, {NextFunction, Request, Response, Router} from "express";
import conversationController from "../../modules/db/conversations/conversation.controller.js";
import {authGuard} from "../../middlewares/auth.js";
import {checkAdmin} from "../../middlewares/checkAdmin.js";

const router: Router = express.Router();

router.get("/", authGuard, checkAdmin, function (req: Request, res: Response, next: NextFunction): void {
    conversationController.getAll(req, res, next);
})

router.get("/:id", authGuard, function (req: Request, res: Response, next: NextFunction): void {
    conversationController.getById(req, res, next);
})

router.post("/", authGuard, function (req: Request, res: Response, next: NextFunction): void {
    conversationController.add(req, res, next);
})

router.get('/user/:userId', authGuard, function (req: Request, res: Response, next: NextFunction): void {
        conversationController.getUserConversation(req, res, next);
    }
);

router.delete("/:id", authGuard, checkAdmin, function (req: Request, res: Response, next: NextFunction): void {
    conversationController.delete(req, res, next);
})

router.patch("/:id/request", authGuard, (req, res, next) => {
    conversationController.respond(req, res, next);
});

export default router;
