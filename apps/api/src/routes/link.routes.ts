import { Router } from "express";
import type { ServiceContext } from "../context";
import * as linkService from "../services/link.service";

// EP-18: the member page. No session: the token in the path is the only credential and the
// cookie is ignored (CD-09). Nothing under /api/links writes expenses, members or details (BR-39).
export function linkRouter(ctx: ServiceContext): Router {
  const router = Router();

  router.get("/:token", async (req, res) => {
    res.json(await linkService.getMemberPage(ctx, req.params.token));
  });

  return router;
}
