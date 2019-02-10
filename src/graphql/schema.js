const { buildSchema } = require('graphql');

const IPost = `
type Post {
    _id: ID!
    title: String
    content: String
    imageUrl: String
    creator: User!
    createdAt: String
    ipdatedAt: String
}
`;

const IUser = `
type User {
    _id: ID!
    email: String!
    name: String!
    password: String!
    status: String
    posts: [Post!]!
}
`;

const IUserInputData = `
input UserInputData {
    email: String!
    name: String!
    password: String!
}
`;

const IPostInputData = `
input PostInputData {
    title: String!, 
    content: String!, 
    imageUrl: String!
}`;

const ICreator = `
type Creator {
    _id: String!
    name: String!
}`;

const IAuthData = `
type AuthData {
    token: String!
    userId: String!
}`;

const IPostListData = `
type PostListData {
    posts: [Post!]!
    totalPosts: Int!
}`;

const IRootQuery = `
type RootQuery {
    login(email: String!, password: String!): AuthData!
    fetchPosts(page: Int!): PostListData!
    fetchSinglePost(postId: ID!): Post!
    user: User!
}`;

const IRootMutation = `
type RootMutation {
    createUser(userInput: UserInputData!): User!
    createPost(postInput: PostInputData!): Post!
    editPost(postId: ID!, postInput: PostInputData!): Post!
    deletePost(postId: ID!): Post!
    editUserStatus(newStatus: String!): String!
}`;

module.exports = buildSchema(`
    ${IPost}
    ${IUser}
    ${IUserInputData}
    ${IAuthData}
    ${IPostInputData}
    ${ICreator}
    ${IPostListData}
    ${IRootQuery}    
    ${IRootMutation}

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);