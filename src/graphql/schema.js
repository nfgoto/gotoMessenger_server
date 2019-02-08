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
    password: String
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

const IRootQuery = `
type RootQuery {
    hello: String
}`;

const IRootMutation = `
type RootMutation {
    createUser(userInput: UserInputData): User!
}`;

module.exports = buildSchema(`
    ${IPost}
    ${IUser}
    ${IUserInputData}
    ${IRootQuery}    
    ${IRootMutation}        

    schema {
        query: RootQuery
        mutation: RootMutation
    }
`);