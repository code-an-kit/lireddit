
import { User } from "../entities/User";
import { MyContext } from "src/types";
import { Arg, Ctx, Field, Mutation, ObjectType, Query, Resolver } from "type-graphql";
import argon2 from "argon2";
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
        @Ctx() {}: MyContext
    ): Promise<User[]>{
        return User.find();
    }

    @Query(() => User, { nullable: true })
    me(@Ctx() { req }: MyContext) {
      // you are not logged in
      if (!req.session.userId) {
        return null;
      }      
      return User.findOne({ id: req.session.userId});
    }

    @Mutation(()=> Boolean)
    async forgotPassword(
        @Arg('email') email: string,
        @Ctx() {redis} : MyContext
    ){
        const user = await User.findOne({where: {email}})
        if(!user){
            return true;
        }

        const token = v4();
        await redis.set(FORGET_PASWORD_PREFIX + token, user.id, "EX", 1000*60*60*24*3)
    
        await sendEmail(email, `<a href='http://localhost:3000/change-password/${token}'>Reset Password</a>`)

        return false
    }
  

    @Mutation(()=> Boolean)
    async deleteRegister(
        @Arg("id") id: number,
        @Ctx() {}: MyContext
    ): Promise<boolean>{
        await User.delete(id);       
        return true;
    }

    @Mutation(()=> UserResponse)
    async register(
        @Arg('options') options: UsernamePasswordInput,
        @Ctx() { req}: MyContext
    ): Promise<UserResponse>{
        console.log("register", options)
        const errors = validateRegister(options);
        if(errors){
            return {errors}
        }
        const hashedPassword = await argon2.hash(options.password)
        let user: User;
        try{
            const result = await User.createQueryBuilder()
                .insert()
                .into(User)
                .values(
                    {
                        username: options.username,
                        email: options.email,
                        password: hashedPassword
                    }
                ).returning('*')
                .execute();

            console.log("result object", result)
            
            user =  result.raw[0];
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
        req.session.userId = user.id;
        return {
            user
        };
    }

    @Mutation(()=> UserResponse)
    async login(
        @Arg('usernameorEmail') usernameorEmail: string,
        @Arg('password') password: string,
        @Ctx() { req}: MyContext
    ): Promise<UserResponse> {
        const user = await User.findOne(usernameorEmail.includes("@") ? 
            { where : {email: usernameorEmail}}:
            { where: {username: usernameorEmail}}
        );
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

        req.session.userId = user.id;

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
        @Ctx() { req, redis}: MyContext
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

        const userIDNum = parseInt(userId)
        const user = await User.findOne(userIDNum)

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

        await User.update(
            {id: userIDNum},
            {password: await argon2.hash(newPassword)}
        )

        await redis.del(key)
        // login user afte chnaging pasword
        console.log("user to login again", user,  req.session.userId)
        req.session.userId = user.id;

        return {
            user
        }
    }
}