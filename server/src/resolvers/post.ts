import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { Post } from "../entities/Post";
import { MyContext } from "src/types";

@Resolver()
export class PostResolver{
    @Query(()=> [Post])
    posts(
        @Ctx() {em}: MyContext
    ): Promise<Post[]>{
        return em.find(Post, {});
    }

    @Mutation(()=> Boolean)
    async deletePost(
        @Arg("_id") _id: number,
        @Ctx() {em}: MyContext
    ): Promise<boolean>{
        await em.nativeDelete(Post, _id)        
        return true;
    }
}