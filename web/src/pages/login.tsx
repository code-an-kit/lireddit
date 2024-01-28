import { Box, Button, Flex, Link } from "@chakra-ui/react";
import { Form, Formik } from "formik";
import * as React from "react";
import { Wrapper } from "../components/wrapper";
import { InputField } from "../components/InputField";
import { useLoginMutation } from "../gql/graphql";
import { toErrorMap } from "../utils/toErrorMap";
import { useRouter } from "next/router";
import { createUrqlClient } from "../utils/createUrqlClient";
import { withUrqlClient } from "next-urql";

interface registerProps {}

const Login: React.FC<registerProps> = ({}) => {
  const router = useRouter();
  const [_, register] = useLoginMutation();
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ usernameorEmail: "", password: "" }}
        onSubmit={async (values, { setErrors }) => {
          const response = await register(values);
          console.log(response);
          if (response.data?.login.errors) {
            setErrors(toErrorMap(response.data.login.errors));
          } else if (response.data?.login.user) {
            router.push("/");
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="usernameorEmail"
              placeholder="username or Email"
              label="username or Email"
            ></InputField>
            <Box mt={4}>
              <InputField
                name="password"
                placeholder="password"
                type="password"
                label="password"
              ></InputField>
            </Box>
            <Flex mt={2}>
              <Link ml="auto" href="/forgot-password">
                Forgot Password
              </Link>
            </Flex>
            <Button
              mt={4}
              type="submit"
              colorScheme="teal"
              isLoading={isSubmitting}
            >
              Login
            </Button>
          </Form>
        )}
      </Formik>
    </Wrapper>
  );
};

export default withUrqlClient(createUrqlClient)(Login);
