import { Connection, IDatabaseDriver } from "@mikro-orm/core"
import { EntityManager } from "@mikro-orm/postgresql"
import { Request, Response } from "express";
// import { RedisClient } from "ioredis/built/connectors/SentinelConnector/types";
import { Redis } from "ioredis";

export type MyContext = {
    em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>;
    req: Request & { session: { userId: number } };
    redis: Redis;
    res: Response;
}