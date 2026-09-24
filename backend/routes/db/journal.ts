import {Router} from "express";
import {authGuard} from "../../middlewares/auth.js";
import {journalService} from "../../modules/db/journal/journal.service.js";

const router = Router();
router.use(authGuard);
router.get("/", async (req, res, next) => {
    try {res.json(await journalService.list(req.user!.id, req.query));} catch (error) {next(error);}
});
router.post("/", async (req, res, next) => {
    try {res.status(201).json({entry: await journalService.create(req.user!.id, req.body)});} catch (error) {next(error);}
});
router.put("/:id", async (req, res, next) => {
    try {await journalService.update(req.user!.id, req.params.id, req.body); res.sendStatus(204);} catch (error) {next(error);}
});
router.delete("/:id", async (req, res, next) => {
    try {await journalService.delete(req.user!.id, req.params.id); res.sendStatus(204);} catch (error) {next(error);}
});
export default router;
