import { User } from "../entities/User";
import { MyContext } from "src/types";
import { Arg, Ctx, Field, InputType, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import argon2 from "argon2";
import { EntityManager } from "@mikro-orm/postgresql";
import { COOKI_NAME } from "../constants";

@InputType()
class UsernamePasswordInput{
    @Field()
    username: string
    @Field()
    password: string
}

@ObjectType()
class FieldError{
    @Field()
    field: string
    @Field()
    message: string
}

@ObjectType()
class UserResponse{
    @Field(()=> [FieldError], {nullable: true})
    errors?: FieldError[]
    @Field(()=> User, {nullable: true})
    user?: User;
}

@Resolver()
export class UserResolver{

    @Query(()=> [User])
    registers(
        @Ctx() {em}: MyContext
    ): Promise<User[]>{
        return em.find(User, {});
    }

    @Query(() => User, { nullable: true })
    async me(@Ctx() { req, em }: MyContext) {
      // you are not logged in
      if (!req.session.userId) {
        return null;
      }
      
      const user = await em.findOne(User, { _id :req.session.userId});
      return user;
    }
  

    @Mutation(()=> Boolean)
    async deleteRegister(
        @Arg("_id") _id: number,
        @Ctx() {em}: MyContext
    ): Promise<boolean>{
        await em.nativeDelete(User, _id)        
        return true;
    }

    @Mutation(()=> UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() {em, req}: MyContext
    ): Promise<UserResponse>{

        if(options.username.length <= 2){
            return {
                errors: [{
                   field: "username",
                   message: 'length must be greater than 2'
                }]
            }
        }
        if(options.password.length <= 2){
            return {
                errors: [{
                   field: "password",
                   message: 'length must be greater than 2'
                }]
            }
        }
        const hashedPassword = await argon2.hash(options.password)
        let user: User;
        // const user = em.create(User, {
        //     username: options.username,
        //     createdAt: "",
        //     updatedAt: "",
        //     password: hashedPassword
        // });
        try{
            const result = await (em as EntityManager).createQueryBuilder(User).getKnexQuery().insert({
                username: options.username,
                created_at: new Date(),
                updated_at: new Date(),
                password: hashedPassword
            }).returning("*");

            user = result[0];
            // await em.persistAndFlush(user)
        }catch(err){
            console.log(err)
           if( err.code === "23505"){
            return {
                errors: [{
                    field: "username",
                    message: 'username already taken'
                 }]
            }
           }
        }
        req.session.userId = user._id;
        return {
            user
        };
    }

    @Mutation(()=> UserResponse)
    async login(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() {em, req}: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(User, {
            username: options.username
        });
        if(!user){
            return {
               errors: [
                {
                    field: 'username',
                    message: "that username doesn't exist"
                }
               ]
            }
        }
        // const hashedPassword = await argon2.hash(user.password);
        const valid = await argon2.verify(user.password, options.password).catch((err) => {
            throw new Error(err)
           });
        if(!valid){
            return {
                errors: [
                    {
                        field: 'password',
                        message: "incorrect password"
                    }
                ]
            }
        };

        req.session.userId = user._id;

        return {
            user,
        }
    }

    @Mutation(()=>Boolean)
    logout (
        @Ctx() {req, res}: MyContext
    ){
        return new Promise(resolve => req.session.destroy(err=>{
            res.clearCookie(COOKI_NAME)
            if(err){
                console.log(err)
                resolve(false)
                return
            }
            resolve(true)
        }))
    }
}