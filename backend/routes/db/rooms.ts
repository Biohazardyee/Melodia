import {NextFunction, Request, Response, Router} from "express";
import roomController from '../../modules/db/rooms/room.controller.js';
import {authGuard} from "../../middlewares/auth.js";
import {checkRoomHost} from "../../middlewares/checkRoomHost.js";
import {checkRoomParticipant} from "../../middlewares/checkRoomParticipant.js";

const router: Router = Router();

router.post('/', authGuard, function (req: Request, res: Response, next: NextFunction): void {
    roomController.add(req, res, next);
});

router.get('/', authGuard, function (req: Request, res: Response, next: NextFunction): void {
    roomController.getAll(req, res, next);
});

router.get('/mine', authGuard, function (req: Request, res: Response, next: NextFunction): void {
    roomController.getMine(req, res, next);
});

router.get('/:id', authGuard, checkRoomParticipant, function (req: Request, res: Response, next: NextFunction): void {
    roomController.getById(req, res, next);
});

router.post('/:id/join', authGuard, function (req: Request, res: Response, next: NextFunction): void {
    roomController.join(req, res, next);
});

router.delete('/:id/leave', authGuard, function (req: Request, res: Response, next: NextFunction): void {
    roomController.leave(req, res, next);
});

router.delete('/:id', authGuard, checkRoomHost, function (req: Request, res: Response, next: NextFunction): void {
    roomController.delete(req, res, next);
});

router.get('/:id/queue', authGuard, checkRoomParticipant, function (req: Request, res: Response, next: NextFunction): void {
    roomController.getQueue(req, res, next);
});

router.post('/:id/queue', authGuard, checkRoomParticipant, function (req: Request, res: Response, next: NextFunction): void {
    roomController.addQueueItem(req, res, next);
});

router.delete('/:id/queue/:itemId', authGuard, checkRoomParticipant, function (req: Request, res: Response, next: NextFunction): void {
    roomController.removeQueueItem(req, res, next);
});

router.post('/:id/invite', authGuard, checkRoomHost, function (req: Request, res: Response, next: NextFunction): void {
    roomController.invite(req, res, next);
});

export default router;
