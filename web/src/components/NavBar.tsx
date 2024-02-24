import { Box, Button, Center, Flex, Heading } from "@chakra-ui/react";
import Link from "next/link";
import * as React from "react";
import { useMeQuery, useLogoutMutation } from "../gql/graphql";
import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../utils/createUrqlClient";
import { isServer } from "../utils/isServer";

interface NavBarProps {}

export const NavBar: React.FC<NavBarProps> = ({}) => {
  const [{ data, fetching }] = useMeQuery();
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
      <Flex align="Center">
        <Button mr={4} as={Link} href="./create-post">
          create a post
        </Button>
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
    <Flex top={0} position={"sticky"} bg={"tan"} zIndex={1} p={4} ml={"auto"}>
      <Flex flex={1} m={"auto"} maxW={800} align="center">
        <Link href="/">
          <Heading>Lireddit</Heading>
        </Link>
        <Box ml={"auto"}>{body}</Box>
      </Flex>
    </Flex>
  );
};
