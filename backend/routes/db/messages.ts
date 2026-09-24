import messageController from "../../modules/db/messages/message.controller.js";
import express, {NextFunction, Request, Response, Router} from "express";
import {authGuard} from "../../middlewares/auth.js";
import {checkResourceOwnerOrAdmin} from "../../middlewares/checkResourceOwnerOrAdmin.js";

import {checkAdmin} from "../../middlewares/checkAdmin.js";

const router: Router = express.Router();

router.get('/', authGuard, checkAdmin, function (req: Request, res: Response, next: NextFunction): void {
    messageController.getAll(req, res, next);
})

router.post('/', authGuard, function (req: Request, res: Response, next: NextFunction): void {
    messageController.add(req, res, next);
})

router.get('/conversation/:conversationId', authGuard, function (req: Request, res: Response, next: NextFunction): void {
    messageController.getByConversationId(req, res, next);
});

router.get('/:id', authGuard, checkResourceOwnerOrAdmin('messages'), function (req: Request, res: Response, next: NextFunction): void {
    messageController.getById(req, res, next);
})

router.put('/:id', authGuard, checkResourceOwnerOrAdmin('messages'), function (req: Request, res: Response, next: NextFunction): void {
    messageController.update(req, res, next);
})

router.delete('/:id', authGuard, checkResourceOwnerOrAdmin('messages'), function (req: Request, res: Response, next: NextFunction): void {
    messageController.delete(req, res, next);
})

export default router;
