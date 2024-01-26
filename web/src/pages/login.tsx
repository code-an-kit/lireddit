import { Box, Button, FormControl, FormLabel, Input } from "@chakra-ui/react";
import { Form, Formik } from "formik";
import * as React from "react";
import { Wrapper } from "../components/wrapper";
import { InputField } from "../components/InputField";
import { useLoginMutation } from "../gql/graphql";
import { toErrorMap } from "../utils/toErrorMap";
import { useRouter } from "next/router";

interface registerProps {}

const Login: React.FC<registerProps> = ({}) => {
  const router = useRouter();
  const [_, register] = useLoginMutation();
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ username: "", password: "" }}
        onSubmit={async (values, { setErrors }) => {
          const response = await register(values);
          console.log(response);
          if (response.data?.login.errors) {
            // console.log(response.data?.login.errors);
            setErrors(toErrorMap(response.data.login.errors));
          } else if (response.data?.login.user) {
            router.push("/");
          }
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <InputField
              name="username"
              placeholder="username"
              label="username"
            ></InputField>
            <Box mt={4}>
              <InputField
                name="password"
                placeholder="password"
                type="password"
                label="password"
              ></InputField>
            </Box>
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

export default Login;
