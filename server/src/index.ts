import { MikroORM } from "@mikro-orm/core";
import { ApolloServer } from "apollo-server-express";
import RedisStore from "connect-redis";
import cors from "cors";
import express from 'express';
import session from "express-session";
import { createClient } from "redis";
import { buildSchema } from "type-graphql";
import { COOKI_NAME } from "./constants";
import mikroConfig from "./mikro-orm.config";
import { UserResolver } from "./resolvers/User";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";

const main =async () => {
    
    const orm = await MikroORM.init(mikroConfig);
    const emFork = orm.em.fork();
    await orm.getMigrator().up();

    const app = express();

    const redisClient = createClient({ legacyMode: false });

    redisClient.on("connect", () => console.log("Connected to Redis!"));
    redisClient.on("error", (err: Error) =>
      console.log("Redis Client Error", err)
    );
   await redisClient.connect();
    app.use(
        cors({
            origin: "http://localhost:3000",
            credentials: true
         })
    );
    // Initialize sesssion storage.
        app.use(
        session({
            name: COOKI_NAME,
            store: new (RedisStore as any)({
                client: redisClient,
                disableTouch: true,
            }),
            cookie: {
                path: "/",
                maxAge: 1000 * 60 * 60 * 24 * 365 * 1, //10 years
                httpOnly: true,
                sameSite: "lax", // csrf
                secure: false, // cookie only works in https
            },
            saveUninitialized: false,
            secret: "bhsbcjsbcsdcbskc",
            resave: false,
        })
    )

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver],
            validate: false
        }),
        context: ({req, res}) => ({em : emFork, req, res})
    })

    await apolloServer.start();
    
    apolloServer.applyMiddleware({
        app,
        cors: false
    })

    app.listen(4000, ()=>{
        console.log('server started on localhost:4000')
    })
}

main().catch((err)=>{
    console.log('error is',err)
})