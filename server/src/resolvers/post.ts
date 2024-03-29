import { session } from 'express-session';
import { isAuth } from './../middleware/isAuth';
import { Arg, Ctx, Field, FieldResolver, InputType, Int, Mutation, ObjectType, Query, Resolver, Root, UseMiddleware } from "type-graphql";
import { Post } from "../entities/Post";
import { MyContext } from "src/types";
import { Updoot } from '../entities/Updoot';
import conn from '../index';
import { Context } from 'vm';

@InputType()
class PostInput{
  @Field()
  title: string

  @Field()
  text: string
}

@ObjectType()
class PaginatedPosts{
    @Field(()=>[Post])
    posts: Post[]

    @Field()
    hasMore: boolean
}

@Resolver(Post)
export class PostResolver{

    //for updoot entity
    @Mutation(()=> Boolean)
    @UseMiddleware(isAuth)
    async vote(
        @Arg('postId', ()=>Int) postId: number,
        @Arg('value', ()=>Int) value: number,
        @Ctx() {req}: MyContext
    ){
        
        const isUpdoot = value !== -1;
        const realValue = isUpdoot ? 1 : -1;
        const {userId} = req.session
        
        const updoot = await  Updoot.findOne({where: {postId, userId}})

        //the usre had voted on the post before
        //and they are changing their vote
        if(updoot && updoot.value !== realValue){
            await conn.transaction(async tm =>{
                await tm.query(`
                update updoot
                set value =  $1
                where "postId" = $2 and "userId" = $3;
                `, [realValue, postId, userId])


                await tm.query(`
                update post
                set points = points + $1
                where id = $2;
                `, [2*realValue, postId])

            })
        }else{
            //has never voted before

            await conn.transaction(async tm =>{
                await tm.query(`
                insert into updoot("userId", "postId", value)
                values ($1, $2, $3);
                `, [userId, postId, realValue])

                await tm.query(`
                update post
                set points = points + $1
                where id = $2;
                `, [realValue, postId])
            })
        }

        return true;
    }


    @FieldResolver(() =>String)
    textSnippet( @Root() root: Post){
       return root.text.slice(0,50)
    }
    
    @Query(()=> PaginatedPosts)
    async posts(
        @Arg('limit', () =>Int) limit: number,
        @Arg('cursor', () =>String, {nullable: true}) cursor: string | null,
        @Ctx() {req} : MyContext
    ): Promise<PaginatedPosts>{
        const realLimit = Math.min(50, limit);
        const realLimitPlusOne = realLimit + 1;
        const replacements: any[] = [realLimitPlusOne]

        if(req.session.userId){
            replacements.push(req.session.userId)
        }

        let currentIdx = 3;
        if(cursor){
            replacements.push(new Date(parseInt(cursor)))
            currentIdx = replacements.length;
        }

        console.log("replacements.length", replacements.length, replacements)

        const posts = await Post.query(
            `
            select p.*,
            json_build_object(
                'id', u.id,
                'username', u.username,
                'email', u.email,
                'createdAt', u."createdAt",
                'updatedAt', u."updatedAt"
                ) creator,
                ${
                    req.session.userId 
                    ? '(select value from updoot where "userId" = $2 and "postId" = p.id) "voteStatus"'
                    : 'null as "voteStatus"'
                }
            from post p
            inner join public.user u on u.id = p."creatorId"
            ${cursor ? `where p."createdAt" < $${currentIdx}` : ""}
            order by p."createdAt" DESC
            limit $1
            `,
            replacements
        )
        // const qb = Post
        //     .getRepository(Post)
        //     .createQueryBuilder("p")
        //     .innerJoinAndSelect(
        //         "p.creator",
        //         "u",
        //         'u.id = p."creatorId"'
        //     )
        //     .orderBy('p."createdAt"',"DESC")
        //     .take(realLimitPlusOne);

            // if(cursor){
            //     qb.where('p."createdAt" < :cursor', { cursor: new Date(parseInt(cursor)) })
            // }

            // const posts = await qb.getMany();

            return {
                posts: posts.slice(0, realLimit),
                hasMore: posts.length === realLimitPlusOne
            };
        // return Post.find();
    }

    @Query(()=> Post, {nullable: true})
    async post(
        @Arg("id", ()=> Int) id: number
    ): Promise<Post | null> {
        return Post.findOne({
            where: {
                id: id
            },
            relations: {
                creator: true
            }
        })
        // return await conn.getRepository(Post).extend({
        //     findPostWithCreator() {
        //         return this.find({
        //             relations: {
        //                 creator: true,
        //             },
        //         })
        //     },
        // })
    }

    @Mutation(()=>Post)
    @UseMiddleware(isAuth)
    async createPost(
        @Arg("input") input: PostInput,
        @Ctx() {req}: MyContext
    ): Promise<Post> {
       
        return Post.create({
            ...input,
            creatorId: req.session.userId,
        }).save();
    }

    @Mutation(()=>Post, {nullable: true})
    @UseMiddleware(isAuth)
    async updatePost(
        @Arg("id",()=> Int) id: number,
        @Arg("title", ()=> String, {nullable: true}) title: string,
        @Arg("text") text:string,
        @Ctx() {req}: MyContext
    ): Promise<Post | null>{
        const post = await Post.createQueryBuilder()
        .update(Post)
        .set({title, text})
        .where('id= :id and "creatorId" = :creatorId', {
            id,
            creatorId: req.session.userId
         })
        .returning("*")
        .execute()

        return post.raw[0];
    }

    @Mutation(()=> Boolean)
    @UseMiddleware(isAuth)
    async deletePost( 
        @Arg("id", ()=>Int) id: number ,
        @Ctx() {req}: Context
    ): Promise<boolean>{
       await Post.delete({id, creatorId: req.session.userId})
       return true;
    }
}