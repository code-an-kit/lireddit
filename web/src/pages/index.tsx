import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../utils/createUrqlClient";
import { usePostsQuery } from "../gql/graphql";
import { Layout } from "../components/layout";
import Link from "next/link";
import { Box, Button, Flex, Heading, Stack, Text } from "@chakra-ui/react";
import { useState } from "react";
import { UpdootSection } from "../components/UpdootSection";

const Index = () => {
  const [variables, setVariables] = useState({
    limit: 15,
    cursor: null as null | string,
  });
  console.log("variables", variables);
  const [{ data, fetching }] = usePostsQuery({
    variables,
  });

  console.log(data);

  if (!fetching && !data) {
    return <div>Your query got failed</div>;
  }

  return (
    <Layout>
      <Flex>
        <Heading>LiReddit</Heading>
        <Box ml="auto">
          <Link href="./create-post">create a post</Link>
        </Box>
      </Flex>
      <br></br>
      {!data && fetching ? (
        <div>loading...</div>
      ) : (
        <Stack spacing={8}>
          {data!.posts.posts.map((p: any) => (
            <Flex
              key={p.title}
              borderRadius={10}
              boxShadow="md"
              py={4}
              px={6}
              border="1px"
              borderColor="gray.200"
            >
              <UpdootSection post={p} />
              <Box>
                <Heading fontSize="xl">{p.title}</Heading>
                {p.creator.username}
                <Text mt={4}>{p.textSnippet}</Text>
              </Box>
            </Flex>
          ))}
        </Stack>
      )}
      {data && data.posts.hasMore ? (
        <Flex>
          <Button
            m="auto"
            my={6}
            onClick={() => {
              setVariables({
                limit: variables.limit,
                cursor: data.posts.posts[data.posts.posts.length - 1].createdAt,
              });
            }}
          >
            Load more...
          </Button>
        </Flex>
      ) : (
        ""
      )}
    </Layout>
  );
};

export default withUrqlClient(createUrqlClient, { ssr: true })(Index);
