import ApiError from "../utils/ApiError.js";

const callbackUrl = (provider) =>
  `${process.env.SERVER_URL}/api/auth/${provider}/callback`;

const postForm = async (url, params) => {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new ApiError(401, "OAuth token exchange failed");
  }
  return data;
};

const getJson = async (url, accessToken) => {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": "whiteboard-app",
    },
  });
  if (!res.ok) throw new ApiError(401, "Failed to fetch OAuth profile");
  return res.json();
};

// Each provider returns { providerId, name, email, avatar } with a verified email.
const providers = {
  google: {
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    authUrl: (state) =>
      "https://accounts.google.com/o/oauth2/v2/auth?" +
      new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: callbackUrl("google"),
        response_type: "code",
        scope: "openid email profile",
        state,
        prompt: "select_account",
      }),
    getProfile: async (code) => {
      const { access_token } = await postForm(
        "https://oauth2.googleapis.com/token",
        {
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: callbackUrl("google"),
          grant_type: "authorization_code",
        },
      );
      const profile = await getJson(
        "https://openidconnect.googleapis.com/v1/userinfo",
        access_token,
      );
      if (!profile.email || !profile.email_verified) {
        throw new ApiError(401, "Google account has no verified email");
      }
      return {
        providerId: profile.sub,
        name: profile.name || profile.email.split("@")[0],
        email: profile.email,
        avatar: profile.picture,
      };
    },
  },

  github: {
    clientId: () => process.env.GITHUB_CLIENT_ID,
    authUrl: (state) =>
      "https://github.com/login/oauth/authorize?" +
      new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: callbackUrl("github"),
        scope: "read:user user:email",
        state,
      }),
    getProfile: async (code) => {
      const { access_token } = await postForm(
        "https://github.com/login/oauth/access_token",
        {
          code,
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          redirect_uri: callbackUrl("github"),
        },
      );
      const profile = await getJson("https://api.github.com/user", access_token);
      const emails = await getJson(
        "https://api.github.com/user/emails",
        access_token,
      );
      const primary =
        emails.find((e) => e.primary && e.verified) ||
        emails.find((e) => e.verified);
      if (!primary) {
        throw new ApiError(401, "GitHub account has no verified email");
      }
      return {
        providerId: String(profile.id),
        name: profile.name || profile.login,
        email: primary.email,
        avatar: profile.avatar_url,
      };
    },
  },
};

export const getProvider = (name) => {
  const provider = providers[name];
  if (!provider) throw ApiError.notFound(`Unknown OAuth provider: ${name}`);
  if (!provider.clientId()) {
    throw new ApiError(500, `${name} OAuth is not configured`);
  }
  return provider;
};
