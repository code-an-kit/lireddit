import { withUrqlClient } from "next-urql";
import { createUrqlClient } from "../utils/createUrqlClient";
import {
  useDeletePostMutation,
  useMeQuery,
  usePostsQuery,
} from "../gql/graphql";
import { Layout } from "../components/layout";
import Link from "next/link";
import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  LinkBox,
  Stack,
  Text,
} from "@chakra-ui/react";
import { useState } from "react";
import { UpdootSection } from "../components/UpdootSection";
import { DeleteIcon, EditIcon } from "@chakra-ui/icons";

const Index = () => {
  const [variables, setVariables] = useState({
    limit: 15,
    cursor: null as null | string,
  });
  const [{ data: meData }] = useMeQuery();
  const [{ data, fetching }] = usePostsQuery({
    variables,
  });

  const [_, deletePost] = useDeletePostMutation();

  if (!fetching && !data) {
    return <div>Your query got failed</div>;
  }

  return (
    <Layout>
      {!data && fetching ? (
        <div>loading...</div>
      ) : (
        <Stack spacing={8}>
          {data!.posts.posts.map((p: any) =>
            !p ? null : (
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
                <Box flex={1}>
                  <Link href="/post/[id]" as={`/post/${p.id}`}>
                    <Heading fontSize="xl">{p.title}</Heading>
                  </Link>
                  posted by {p.creator.username}
                  <Flex align={"center"}>
                    <Text flex={1} mt={4}>
                      {p.textSnippet}
                    </Text>
                    {meData?.me?.id !== p.creator.id ? null : (
                      <Box ml={"auto"}>
                        <Link href="/post/edit/[id]" as={`post/edit/${p.id}`}>
                          <IconButton
                            mr={4}
                            aria-label={"Edit Post"}
                            icon={<EditIcon />}
                          ></IconButton>
                        </Link>
                        <IconButton
                          aria-label={"deletePost"}
                          onClick={() => {
                            deletePost({ id: p.id });
                          }}
                          icon={<DeleteIcon />}
                        ></IconButton>
                      </Box>
                    )}
                  </Flex>
                </Box>
              </Flex>
            )
          )}
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
