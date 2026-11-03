const API = "https://api.github.com"

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "GitHubError"
  }
}

export interface GitHubUser {
  login: string
  name: string | null
  avatarUrl: string
}

export interface GitHubRepo {
  owner: string
  name: string
  fullName: string
  defaultBranch: string
  private: boolean
  canPush: boolean
}

interface RawRepo {
  name: string
  full_name: string
  default_branch: string
  private: boolean
  owner: { login: string }
  permissions?: { push?: boolean; admin?: boolean }
}

function mapRepo(raw: RawRepo): GitHubRepo {
  return {
    owner: raw.owner.login,
    name: raw.name,
    fullName: raw.full_name,
    defaultBranch: raw.default_branch,
    private: raw.private,
    canPush: Boolean(raw.permissions?.push || raw.permissions?.admin),
  }
}

function friendlyMessage(status: number, fallback: string): string {
  if (status === 401) return "GitHub rejected the token. It may be invalid or expired."
  if (status === 403) return "The token lacks permission for this action. It needs Contents and Pull requests write access."
  if (status === 404) return "Not found, or the token cannot see this repository."
  if (status === 422) return fallback || "GitHub could not process the request."
  return fallback || `GitHub request failed (${status}).`
}

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/")

export type GitHubClient = ReturnType<typeof createGitHubClient>

/**
 * Minimal GitHub REST client that runs in the browser. The token is only ever
 * sent to api.github.com; it never touches this app's server.
 */
export function createGitHubClient(token: string, fetchImpl: typeof fetch = (...args) => fetch(...args)) {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetchImpl(`${API}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!response.ok) {
      let detail = ""
      try {
        detail = ((await response.json()) as { message?: string }).message ?? ""
      } catch {}
      throw new GitHubError(friendlyMessage(response.status, detail), response.status)
    }
    if (response.status === 204) return undefined as T
    return (await response.json()) as T
  }

  return {
    async getUser(): Promise<GitHubUser> {
      const data = await request<{ login: string; name: string | null; avatar_url: string }>("GET", "/user")
      return { login: data.login, name: data.name, avatarUrl: data.avatar_url }
    },

    async listRepos(): Promise<GitHubRepo[]> {
      const data = await request<RawRepo[]>("GET", "/user/repos?per_page=100&sort=pushed&affiliation=owner,collaborator,organization_member")
      return data.map(mapRepo)
    },

    async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
      return mapRepo(await request<RawRepo>("GET", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`))
    },

    /** Returns the blob sha of an existing file, or null when it does not exist. */
    async getFileSha(owner: string, repo: string, path: string, ref: string): Promise<string | null> {
      try {
        const data = await request<{ sha: string; type: string }>(
          "GET",
          `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodePath(path)}?ref=${encodeURIComponent(ref)}`,
        )
        return data.type === "file" ? data.sha : null
      } catch (error) {
        if (error instanceof GitHubError && error.status === 404) return null
        throw error
      }
    },

    async getBranchSha(owner: string, repo: string, branch: string): Promise<string> {
      const data = await request<{ object: { sha: string } }>(
        "GET",
        `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/ref/heads/${encodePath(branch)}`,
      )
      return data.object.sha
    },

    async createBranch(owner: string, repo: string, branch: string, sha: string): Promise<void> {
      await request("POST", `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/refs`, {
        ref: `refs/heads/${branch}`,
        sha,
      })
    },

    async putFile(input: {
      owner: string
      repo: string
      path: string
      branch: string
      message: string
      contentBase64: string
      sha?: string | null
    }): Promise<void> {
      await request("PUT", `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/contents/${encodePath(input.path)}`, {
        message: input.message,
        content: input.contentBase64,
        branch: input.branch,
        ...(input.sha ? { sha: input.sha } : {}),
      })
    },

    async createPullRequest(input: {
      owner: string
      repo: string
      title: string
      body: string
      head: string
      base: string
    }): Promise<{ number: number; url: string }> {
      const data = await request<{ number: number; html_url: string }>(
        "POST",
        `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}/pulls`,
        { title: input.title, body: input.body, head: input.head, base: input.base },
      )
      return { number: data.number, url: data.html_url }
    },
  }
}
