import { Connection, IDatabaseDriver } from "@mikro-orm/core"
import { EntityManager } from "@mikro-orm/postgresql"
import { Request, Response } from "express";

export type MyContext = {
    em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>;
    req: Request & { session: { userId: number } };
    res: Response;
}