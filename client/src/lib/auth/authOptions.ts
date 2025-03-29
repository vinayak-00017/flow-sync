import CredentialsProvider from "next-auth/providers/credentials";
import { eq, or } from "drizzle-orm";
import GoogleProvider from "next-auth/providers/google";
import db from "../db/src/db";
import { users } from "../db/src/schema";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
    // CredentialsProvider({
    //   name: "Credentials",
    //   credentials: {
    //     usernameOrEmail: { label: "Username / Email", type: "text" },
    //     password: {
    //       label: "Password",
    //       type: "password",
    //     },
    //   },
    //   async authorize(credentials: any) {
    //     try {
    //       const existingUser = await db
    //         .select({
    //           email: users.email,
    //           password: users.password,
    //           id: users.id,
    //           username: users.username,
    //           profilePic: users.profilePic,
    //         })
    //         .from(users)
    //         .where(
    //           or(
    //             eq(users.email, credentials.usernameOrEmail),
    //             eq(users.username, credentials.usernameOrEmail)
    //           )
    //         );

    //       // If user exists, verify password
    //       if (existingUser.length !== 0) {
    //         if (!existingUser[0].password) {
    //           return null;
    //         }
    //         const passwordValidation = await bcrypt.compare(
    //           credentials?.password,
    //           existingUser[0].password
    //         );
    //         if (passwordValidation) {
    //           return {
    //             id: existingUser[0].id,
    //             email: existingUser[0].email,
    //             image: existingUser[0].profilePic,
    //             username: existingUser[0].username,
    //           };
    //         }
    //         return null;
    //       }

    //       // If this is a signup request (indicated by username field)
    //       if (credentials.username) {
    //         const hashedPassword = await bcrypt.hash(credentials?.password, 10);
    //         const newUser = await db
    //           .insert(users)
    //           .values({
    //             username: credentials.username,
    //             password: hashedPassword,
    //             email: credentials.usernameOrEmail,
    //           })
    //           .returning();
    //         return {
    //           id: newUser[0].id,
    //           email: newUser[0].email,
    //           username: newUser[0].username,
    //         };
    //       }

    //       // If user doesn't exist and it's not a signup request, return null
    //       return null;
    //     } catch (err) {
    //       console.error(err);
    //       return null;
    //     }
    //   },
    // }),
  ],

  pages: {
    // signIn: '/auth/signin',
    // signOut: '/auth/signout',
    // error: '/auth/error', // Error code passed in query string as ?error=
    // verifyRequest: '/auth/verify-request', // (used for check email message)
    // newUser: '/auth/new-user' // If set, new users will be directed here on first sign in
  },

  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async signIn({ user, account }: any) {
      if (account.provider === "google") {
        try {
          const { email, name, image } = user;
          const ifUserExists = await db
            .select({
              email: users.email,
              id: users.id,
            })
            .from(users)
            .where(eq(users.email, email));

          if (ifUserExists.length === 0) {
            const newUser = {
              name,
              email,
              image: image,
            };
            await db.insert(users).values(newUser);
            // return Promise.resolve("/");
          } else {
            user.id = ifUserExists[0].id;
          }
        } catch (err) {
          console.error(err);
        }
      }
      return user;
    },
    // async jwt({ token, existingUser }: any) {
    //   console.log(existingUser);
    //   token.username = existingUser.username;
    // },

    async session({ token, session }: any) {
      session.user.id = token.sub;

      // session.user.username = token.username;

      return session;
    },
  },
};
