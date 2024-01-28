import { User } from "../entities/User";
import { MyContext } from "src/types";
import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import argon2 from "argon2";
import { EntityManager } from "@mikro-orm/postgresql";
import { COOKI_NAME, FORGET_PASWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "../utils/UsernamePasswordInput";
import { validateRegister } from "../utils/validateRegister";
import { sendEmail } from "../utils/sendEmail";
import { v4 } from "uuid";

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
    async forgotPassword(
        @Arg('email') email: string,
        @Ctx() {em, redis} : MyContext
    ){
        const user = await em.findOne(User, {email})
        console.log("user from forgot password",user)
        if(!user){
            return true;
        }

        const token = v4();
        await redis.set(FORGET_PASWORD_PREFIX + token, user._id, "EX", 1000*60*60*24*3)
    
        await sendEmail(email, `<a href='https://localhost:3000/change-password/${token}'>Reset Password</a>`)

        return false
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
        console.log("register", options)
        const errors = validateRegister(options);
        if(errors){
            return {errors}
        }
        const hashedPassword = await argon2.hash(options.password)
        let user: User;
        try{
            const result = await (em as EntityManager).createQueryBuilder(User).getKnexQuery().insert({
                username: options.username,
                created_at: new Date(),
                email: options.email,
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
        @Arg('usernameorEmail') usernameorEmail: string,
        @Arg('password') password: string,
        @Ctx() {em, req}: MyContext
    ): Promise<UserResponse> {
        const user = await em.findOne(User, usernameorEmail.includes("@") ? {email: usernameorEmail}: {username: usernameorEmail});
        if(!user){
            return {
               errors: [
                {
                    field: 'usernameorEmail',
                    message: "that username doesn't exist"
                }
               ]
            }
        }
        // const hashedPassword = await argon2.hash(user.password);
        const valid = await argon2.verify(user.password, password).catch((err) => {
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
   
    @Mutation(()=> UserResponse)
    async changePassword(
        @Arg('token') token: string,
        @Arg('newPassword') newPassword: string,
        @Ctx() {em, req, redis}: MyContext
    ){
        if(newPassword.length <= 2){
            return [
                {
                   field: "newPassword",
                   message: 'length must be greater than 2'
                }
            ]
        }
        const key = FORGET_PASWORD_PREFIX + token;
        const userId = await redis.get(key)

        if(!userId){
            return {
                errors: [
                    {
                       field: "token",
                       message: 'token expired'
                    }
                ]
            }
        }

        const user = await em.findOne(User, {_id: parseInt(userId)})

        if(!user){
            return {
                errors: [
                    {
                       field: "token",
                       message: 'user no longer exist'
                    }
                ]
            }
        }

        user.password =  await argon2.hash(newPassword);

        await redis.del(key)
        // login user afte chnaging pasword
        req.session.userId = user._id;

        return {
            user
        }
    }
}