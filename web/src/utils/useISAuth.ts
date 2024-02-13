import { useRouter } from "next/router";
import { useEffect } from "react";
import { useMeQuery } from "../gql/graphql";

export const useISAuth =() =>{
const [{ data, fetching }] = useMeQuery();
console.log("data from useAUth", data)
  const router = useRouter();
    useEffect(() => {
        if (!fetching && !data?.me) {
            router.replace("/login?next=" + router.pathname);
        }
    });
}