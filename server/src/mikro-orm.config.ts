import { MikroORM } from "@mikro-orm/postgresql";
import { _prod_ } from "./constants";
import { Post } from "./entities/Post";
import path from "path";
import { User } from "./entities/User";

export default {
    migrations: {
        path: path.join(__dirname, './migrations'), // path to the folder with migrations
        glob: '!(*.d).{js,ts}',
    },
    entities: [Post, User],
    dbName: 'lireddit',
    password: 'Ankit@123',
    type: 'postgresql',
    debug: !_prod_,
} as Parameters<typeof MikroORM.init>[0];