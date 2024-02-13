"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const apollo_server_express_1 = require("apollo-server-express");
const connect_redis_1 = __importDefault(require("connect-redis"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const express_session_1 = __importDefault(require("express-session"));
const ioredis_1 = require("ioredis");
const type_graphql_1 = require("type-graphql");
const constants_1 = require("./constants");
const User_1 = require("./resolvers/User");
const hello_1 = require("./resolvers/hello");
const post_1 = require("./resolvers/post");
const typeorm_1 = require("typeorm");
const Post_1 = require("./entities/Post");
const User_2 = require("./entities/User");
const path_1 = __importDefault(require("path"));
const Updoot_1 = require("./entities/Updoot");
const conn = new typeorm_1.DataSource({
    type: "postgres",
    database: "lireddit2",
    username: 'postgres',
    password: 'Ankit@123',
    logging: true,
    synchronize: true,
    migrations: [path_1.default.join(__dirname, "./migrations/*")],
    entities: [Post_1.Post, User_2.User, Updoot_1.Updoot]
});
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    conn.initialize()
        .then(() => {
        conn.runMigrations();
        console.log("Data Source has been initialized!");
    })
        .catch((err) => {
        console.error("Error during Data Source initialization", err);
    });
    const app = express_1.default();
    const redis = new ioredis_1.Redis({});
    redis.on("connect", () => console.log("Connected to Redis!"));
    redis.on("error", (err) => console.log("Redis Client Error", err));
    app.use(cors_1.default({
        origin: "http://localhost:3000",
        credentials: true
    }));
    app.use(express_session_1.default({
        name: constants_1.COOKI_NAME,
        store: new connect_redis_1.default({
            client: redis,
            disableTouch: true,
        }),
        cookie: {
            path: "/",
            maxAge: 1000 * 60 * 60 * 24 * 365 * 1,
            httpOnly: true,
            sameSite: "lax",
            secure: false,
        },
        saveUninitialized: false,
        secret: "bhsbcjsbcsdcbskc",
        resave: false,
    }));
    const apolloServer = new apollo_server_express_1.ApolloServer({
        schema: yield type_graphql_1.buildSchema({
            resolvers: [hello_1.HelloResolver, post_1.PostResolver, User_1.UserResolver],
            validate: false
        }),
        context: ({ req, res }) => ({ req, res, redis })
    });
    yield apolloServer.start();
    apolloServer.applyMiddleware({
        app,
        cors: false
    });
    app.listen(4000, () => {
        console.log('server started on localhost:4000');
    });
});
main().catch((err) => {
    console.log('error is', err);
});
exports.default = conn;
//# sourceMappingURL=index.js.map