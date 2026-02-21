import { defineApp } from "convex/server";
import rateLimiter from "@convex-dev/rate-limiter/convex.config";
import workflow from "@convex-dev/workflow/convex.config";
import actionRetrier from "@convex-dev/action-retrier/convex.config";
import crons from "@convex-dev/crons/convex.config";
import actionCache from "@convex-dev/action-cache/convex.config";
import aggregate from "@convex-dev/aggregate/convex.config";
import migrations from "@convex-dev/migrations/convex.config";
import rag from "@convex-dev/rag/convex.config";
import persistentTextStreaming from "@convex-dev/persistent-text-streaming/convex.config";
import workpool from "@convex-dev/workpool/convex.config";

const app = defineApp();
app.use(rateLimiter);
app.use(workflow);
app.use(actionRetrier);
app.use(crons);
app.use(actionCache);
// Three named aggregate instances — each gets isolated storage for its counter
app.use(aggregate, { name: "pendingSignups" });
app.use(aggregate, { name: "openTickets" });
app.use(aggregate, { name: "activeClients" });
app.use(migrations);
app.use(rag);
app.use(persistentTextStreaming);
app.use(workpool, { name: "aiWorkpool" });

export default app;
