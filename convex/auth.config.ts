export default {
  providers: [
    {
      domain: process.env.CLERK_ISSUER_BASE_URL, // From Convex Settings URL !
      applicationID: "convex",
    },
  ],
};
