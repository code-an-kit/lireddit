import { ChevronUpIcon, ChevronDownIcon } from "@chakra-ui/icons";
import { Flex, IconButton } from "@chakra-ui/react";
import React from "react";
import { PostSnippetFragment } from "../gql/graphql";

interface UpdootSectionProps {
  post: PostSnippetFragment;
}

export const UpdootSection: React.FC<UpdootSectionProps> = ({ post }) => {
  return (
    <Flex direction="column" justifyContent="center" alignItems="center" mr={4}>
      <IconButton aria-label="updoot" icon={<ChevronUpIcon />}></IconButton>
      {post.points}
      <IconButton aria-label="downdoot" icon={<ChevronDownIcon />}></IconButton>
    </Flex>
  );
};
