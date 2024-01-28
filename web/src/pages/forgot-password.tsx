import { withUrqlClient } from "next-urql";
import React, { useState } from "react";
import { createUrqlClient } from "../utils/createUrqlClient";
import { Box, Button } from "@chakra-ui/react";
import { Formik, Form } from "formik";
import { InputField } from "../components/InputField";
import { Wrapper } from "../components/wrapper";
import { useForgotPasswordMutation } from "../gql/graphql";

const ForgotPassword: React.FC<{}> = ({}) => {
  const [, forgotPassword] = useForgotPasswordMutation();
  const [complete, setComplete] = useState(false);
  return (
    <Wrapper variant="small">
      <Formik
        initialValues={{ email: "" }}
        onSubmit={async (values) => {
          console.log("values", values);
          await forgotPassword(values);
          setComplete(true);
        }}
      >
        {({ isSubmitting }) =>
          complete ? (
            <Box>
              If anaccount with the emailexist we have sent you an email
            </Box>
          ) : (
            <Form>
              <InputField
                name="email"
                placeholder="Email"
                label="Email"
              ></InputField>
              <Button
                mt={4}
                type="submit"
                colorScheme="teal"
                isLoading={isSubmitting}
              >
                Forgot Password
              </Button>
            </Form>
          )
        }
      </Formik>
    </Wrapper>
  );
};

export default withUrqlClient(createUrqlClient, { ssr: false })(ForgotPassword);
