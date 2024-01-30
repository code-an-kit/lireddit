import "reflect-metadata"
import { ApolloServer } from "apollo-server-express";
import RedisStore from "connect-redis";
import cors from "cors";
import express from 'express';
import session from "express-session";
import { Redis } from "ioredis";
import { buildSchema } from "type-graphql";
import { COOKI_NAME } from "./constants";
import { UserResolver } from "./resolvers/User";
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { DataSource } from "typeorm";
import { Post } from "./entities/Post";
import { User } from "./entities/User";

const conn = new DataSource({
    type: "postgres",
    database: "lireddit2",
    username: 'postgres',
    password: 'Ankit@123',
    logging: true,
    synchronize: true, 
    migrations: ["../migrations/*"],
    entities: [Post, User]
})

    conn.initialize()
        .then(() => {
            console.log("Data Source has been initialized!")
        })
        .catch((err) => {
            console.error("Error during Data Source initialization", err)
    })

// console.log("conn is from index",conn)

const main = async () => {
    
    const app = express();

    // const redisClient = createClient({ legacyMode: false });
    const redis = new Redis({})

    redis.on("connect", () => console.log("Connected to Redis!"));
    redis.on("error", (err: Error) =>
      console.log("Redis Client Error", err)
    );
//    await redis.connect();
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
                client: redis,
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
        context: ({req, res}) => ({ req, res, redis})
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

export default conn;