import {NextFunction, Request, Response, Router} from "express";
import notificationController from '../../modules/db/notifications/notification.controller.js';
import {authGuard} from "../../middlewares/auth.js";
import {checkAdmin} from "../../middlewares/checkAdmin.js";
import {checkResourceOwnerOrAdmin} from "../../middlewares/checkResourceOwnerOrAdmin.js";
import { checkAdminOrSelf } from "../../middlewares/checkAdminOrSelf.js";
import {getInbox, readInbox} from "../../modules/db/notifications/notification.inbox.js";

const router: Router = Router();

router.get('/inbox', authGuard, async (req, res, next) => {
    try {res.json(await getInbox(req.user!.id, req.query));} catch (error) {next(error);}
});

router.put('/read-all', authGuard, async (req, res, next) => {
    try {res.json(await readInbox(req.user!.id));} catch (error) {next(error);}
});

router.post('/', authGuard, function (req: Request, res: Response, next: NextFunction): void {
    notificationController.add(req, res, next);
});

router.get('/', authGuard, checkAdmin, function (req: Request, res: Response, next: NextFunction): void {
    notificationController.getAll(req, res, next);
});

router.get('/user/:id', authGuard, checkAdminOrSelf, function (req: Request, res: Response, next: NextFunction): void {
    notificationController.getByUser(req, res, next);
});

router.get('/:id', authGuard, checkResourceOwnerOrAdmin('notifications'), function (req: Request, res: Response, next: NextFunction): void {
    notificationController.getById(req, res, next);
});



router.put('/:id', authGuard, checkResourceOwnerOrAdmin('notifications'), function (req: Request, res: Response, next: NextFunction): void {
    notificationController.update(req, res, next);
});

router.delete('/:id', authGuard, checkAdmin, function (req: Request, res: Response, next: NextFunction): void {
    notificationController.delete(req, res, next);
});

export default router;
