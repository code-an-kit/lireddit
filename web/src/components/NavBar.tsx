import { Box, Button, Flex } from "@chakra-ui/react";
import Link from "next/link";
import * as React from "react";
import { useMeQuery, useLogoutMutation } from "../gql/graphql";
import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../utils/createUrqlClient";
import { isServer } from "../utils/isServer";

interface NavBarProps {}

export const NavBar: React.FC<NavBarProps> = ({}) => {
  const [{ data, fetching }] = useMeQuery({
    pause: isServer(),
  });
  const [{ fetching: fetchingLogout }, logout] = useLogoutMutation();
  // console.log("console from navbar", isServer(), data);
  let body = null;
  // data in loading
  if (fetching) {
    //user is not logged in
  } else if (!data?.me) {
    body = (
      <>
        <Link style={{ marginRight: "10px" }} href={"/login"}>
          Login
        </Link>
        <Link href={"/register"}>Register</Link>
      </>
    );
    //user logged in
  } else {
    body = (
      <Flex>
        <Box mr={2}>{data.me.username}</Box>
        <Button
          onClick={() => {
            logout();
          }}
          isLoading={fetchingLogout}
          variant="link"
        >
          Logout
        </Button>
      </Flex>
    );
  }

  return (
    <Flex bg="tan" p={4} ml={"auto"}>
      <Box ml={"auto"}>{body}</Box>
    </Flex>
  );
};
