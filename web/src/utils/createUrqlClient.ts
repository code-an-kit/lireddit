import { Ctx } from 'type-graphql';
import { isServer } from './isServer';
import { Query, PaginatedPosts, VoteMutationVariables, DeletePostDocument, DeletePostMutationVariables } from './../gql/graphql';
import { fetchExchange, gql, mapExchange, stringifyVariables } from "urql";
import {
    LoginMutation,
    LogoutMutation,
    MeDocument,
    MeQuery,
    RegisterMutation,
  } from "../gql/graphql";
import { betterUpdateQuery } from "./betterUpdateQuery";
import { Resolver, cacheExchange } from "@urql/exchange-graphcache";
import Router from "next/router";

const cursorPagination = (): Resolver => {
  return (_parent, fieldArgs, cache, info) => {
    const { parentKey: entityKey, fieldName } = info;

    const allFields = cache.inspectFields(entityKey);
    const fieldInfos = allFields.filter((info) => info.fieldName === fieldName);
    const size = fieldInfos.length;
    if (size === 0) {
      return undefined;
    }
    const fieldKey = `${fieldName}(${stringifyVariables(fieldArgs)})`;
    const isItInTheCache = cache.resolve(cache.resolve(entityKey, fieldKey) as string, "posts");

    info.partial = !isItInTheCache;
    console.log("isItInTheCache",isItInTheCache)
    const results = [];
    let hasMore = true;

    fieldInfos.forEach(fi =>{
      const key = cache.resolve(entityKey, fi.fieldKey) as string;
      const data = cache.resolve(key, "posts") as string[]
      const _hasMore = cache.resolve(key, "hasMore")
      if(!_hasMore){
        hasMore = _hasMore as boolean
      }
      console.log("data",hasMore)
      results.push(...data)
    })
    console.log("results", results)
    
    return {
      __typename: "PaginatedPosts",
      hasMore,
      posts: results
    };
  };
};

export const createUrqlClient = ((ssrExchange: any, Ctx:any) => {
  let cookie = "";
  if(isServer()){
    cookie = Ctx?.req?.headers?.cookie
  }
  return  {
    url: "http://localhost:4000/graphql",
    fetchOptions: {
      credentials: "include",
      headers: cookie ? 
      {
        cookie
      } : undefined
    },
    exchanges: [
      cacheExchange({
        keys:{
          PaginatedPosts: ()=>null
        },
        updates: {
          Mutation: {
            vote:(_result, args, cache, info)=> {
              const {postId, value} = args as VoteMutationVariables;
              const data = cache.readFragment(
                gql`
                  fragment _ on Post {
                    id
                    points
                    voteStatus
                  }
                `,
                { id: postId }
              );
              if(data){
                if(data.voteStatus === value){
                  return
                }
                const newPoints = (data.points as number) + (data.voteStatus ? 1 : 2)*value;
                // const newPoints = (data.points as number) + value;
                cache.writeFragment( gql`
                fragment __ on Post {
                  points
                  voteStatus
                }
              `, { id: postId, points: newPoints, voteStatus: value });
              }
            },
            logout: (_result, args, cache, info) => {
              betterUpdateQuery<LogoutMutation, MeQuery>(
                cache,
                { query: MeDocument },
                _result,
                () => ({ me: null })
              );
              const allFields = cache.inspectFields("Query")
              const fieldInfos = allFields.filter(info => info.fieldName === 'posts')
              fieldInfos.forEach(fi => {
                cache.invalidate("Query", "posts", fi.arguments || {})
              })
            },
            login: (_result, args, cache, info) => {
              betterUpdateQuery<LoginMutation, MeQuery>(
                cache,
                { query: MeDocument },
                _result,
                (result, query) => {
                  console.log("hjdcj")
                  if (result.login.errors) {
                    return query;
                  } else {
                    return {
                      me: result.login.user,
                    };
                  }
                }
              );
              const allFields = cache.inspectFields("Query")
              const fieldInfos = allFields.filter(info => info.fieldName === 'posts')
              fieldInfos.forEach(fi => {
                cache.invalidate("Query", "posts", fi.arguments || {})
              })
            },
            register: (_result, args, cache, info) => {
              betterUpdateQuery<RegisterMutation, MeQuery>(
                cache,
                { query: MeDocument },
                _result,
                (result, query) => {
                  if (result.register.errors) {
                    return query;
                  } else {
                    return {
                      me: result.register.user,
                    };
                  }
                }
              );
            },
            createPost: (_result, args, cache, info) => {
              const allFields = cache.inspectFields("Query")
              const fieldInfos = allFields.filter(info => info.fieldName === 'posts')
              fieldInfos.forEach(fi => {
                cache.invalidate("Query", "posts", fi.arguments || {})
              })
              
            },
            deletePost: (_result, args, cache, info) =>{
              cache.invalidate({
                __typename: "Post",
                id: (args as DeletePostMutationVariables).id
              })
            }
          },
        },
        resolvers:{
          Query:{
            posts: cursorPagination()
          }
        }
      }),
      mapExchange({
        onError(error) {
          if (error?.message.includes("not authenticated")) {
            Router.replace("./login");
          }
        }
      }),
      ssrExchange,
      fetchExchange,
    ]
  }
})