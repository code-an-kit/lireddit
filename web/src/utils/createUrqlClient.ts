import { Query, PaginatedPosts } from './../gql/graphql';
import { fetchExchange, mapExchange, stringifyVariables } from "urql";
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

export const createUrqlClient = ((ssrExchange: any) => ({
    url: "http://localhost:4000/graphql",
    fetchOptions: {
      credentials: "include"
    },
    exchanges: [
      cacheExchange({
        keys:{
          PaginatedPosts: ()=>null
        },
        updates: {
          Mutation: {
            logout: (_result, args, cache, info) => {
              betterUpdateQuery<LogoutMutation, MeQuery>(
                cache,
                { query: MeDocument },
                _result,
                () => ({ me: null })
              );
            },
            login: (_result, args, cache, info) => {
              betterUpdateQuery<LoginMutation, MeQuery>(
                cache,
                { query: MeDocument },
                _result,
                (result, query) => {
                  if (result.login.errors) {
                    return query;
                  } else {
                    return {
                      me: result.login.user,
                    };
                  }
                }
              );
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
  }))