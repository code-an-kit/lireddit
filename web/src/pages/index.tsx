import { withUrqlClient } from "next-urql";
import { NavBar } from "../components/NavBar";
import { createUrqlClient } from "../utils/createUrqlClient";
import { usePostsQuery } from "../gql/graphql";

const Index = () => {
  const [{ data }] = usePostsQuery();
  console.log("dta from postsquery", data);
  return (
    <>
      <NavBar />
      <div> hello world </div>
      <br></br>
      {!data ? (
        <div>loading...</div>
      ) : (
        data.posts.map((p) => <div key={p._id}>{p.title}</div>)
      )}
    </>
  );
};

export default withUrqlClient(createUrqlClient)(Index);