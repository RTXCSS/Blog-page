const timestamp = new Date().toISOString();
const seed = {
  projects: [
    {
      _id: 'p1',
      name: 'Second Brain',
      description: 'A home for everything I learn.',
      color: 'sage',
    },
    {
      _id: 'p2',
      name: 'Blog project',
      description: 'Building things for the web.',
      color: 'peach',
    },
    {
      _id: 'p3',
      name: 'Learning journal',
      description: 'Small discoveries, lasting connections.',
      color: 'lavender',
    },
  ],
  documents: [
    {
      _id: 'd1',
      title: 'RAG, in my own words',
      kind: 'note',
      tags: ['AI', 'learning'],
      project: 'p1',
      content:
        'Retrieval-augmented generation connects a language model to a personal knowledge library. First, split documents into overlapping chunks. Embed each chunk using text-embedding-3-large and store the vectors in ChromaDB. Embed the incoming question with the same model, retrieve relevant chunks, then ask GPT-4o-mini to answer using only that evidence. Citations let you check the original source. Hybrid search combines semantic similarity with exact keyword matches.',
    },
    {
      _id: 'd2',
      title: 'The architecture behind my blog',
      kind: 'markdown',
      tags: ['MERN', 'projects'],
      project: 'p2',
      content:
        'My Blog-page project uses React for the interface, Express and Node.js for the API, and MongoDB to store users and posts. JWT cookies authenticate requests. Socket.IO powers real-time chat between users. Models, routes, middleware, and services keep responsibilities separate. In the Second Brain extension, a separate FastAPI service processes documents and connects to ChromaDB.',
    },
    {
      _id: 'd3',
      title: 'Little things worth remembering',
      kind: 'note',
      tags: ['ideas'],
      project: 'p3',
      content:
        'Good tools leave room to think. Write down an idea before it disappears. Connect a new concept to something you already know. A useful personal knowledge system should help you find your own words, not just generate more words. Keep notes short, give them a meaningful title, and review them when starting something new.',
    },
    {
      _id: 'd4',
      title: 'Authentication field notes',
      kind: 'code',
      tags: ['JWT', 'security'],
      project: 'p2',
      content:
        'JWT authentication uses a signed, expiring token inside an HttpOnly cookie. Passwords are hashed with bcrypt. The server validates the JWT signature, issuer, audience, expiry, and session version. Every document query includes the current user as owner. Socket.IO authenticates the handshake and checks room membership before saving a message. Logging out invalidates sessions and disconnects sockets.',
    },
  ].map((d, i) => ({
    ...d,
    status: 'ready',
    chunks: i + 3,
    size: 2048 + i * 1024,
    createdAt: timestamp,
  })),
  conversations: [],
  comments: [],
  blogs: [
    [
      'The small art of connecting what you know',
      'Learning',
      'sage',
      'A personal knowledge base is more than a place to put things. It is a way to find your way back to an idea - and see it differently.',
      '## A notebook with a little room to grow\n\nWe collect more ideas than we can remember. A sentence from a book, a useful conversation, a solution that finally made sense. The challenge is returning to them when they matter.\n\nStart with one note. Give it a title you would actually search for. Add a few words about why it matters to you.\n\n> The most useful knowledge system is one you enjoy coming back to.\n\n## Make a connection\n\nWhen you learn something new, ask what it reminds you of. Link a coding lesson to a design decision. Connect a question to a project. Those small bridges make knowledge useful.\n\n## Leave a little space\n\nYou do not need a perfect system. You need a small habit: capture, connect, return. Over time, your notebook becomes a conversation with your own curiosity.',
    ],
    [
      'A friendlier way to think about RAG',
      'Technology',
      'peach',
      'How a language model, a few good notes, and a search engine work together to answer a better question.',
      '## Start with the source\n\nRetrieval-augmented generation starts by finding relevant information in your own library. Documents are split into overlapping passages and embedded into vectors.\n\nThis project uses **text-embedding-3-large** for both documents and incoming questions. ChromaDB stores the vectors, and hybrid search combines meaning with keyword matches.\n\n## Give the answer something to stand on\n\nGPT-4o-mini receives the retrieved passages and a question. Its task is to answer from those passages and cite them. When the evidence is missing, a useful answer says so.\n\nCitations make it possible to check a claim, revisit the context, and keep thinking.',
    ],
    [
      'Designing a little space to think',
      'Design',
      'lavender',
      'On quieter interfaces, warm colors, and making software feel a little more like a place you want to be.',
      '## Let the content breathe\n\nA calmer interface starts with choosing what matters. A clear title. A comfortable reading width. Enough space to pause between ideas.\n\nThe palette here borrows from a paper notebook: cream, sage, soft peach, and a little lavender. Serif headings bring warmth; simple controls keep the next step clear.\n\n## Make the small things kind\n\nA helpful empty state can invite someone to begin. A clear error can explain how to try again. An honest progress message can make waiting feel understandable.\n\nGood design respects both attention and time.',
    ],
    [
      'Learning in public, one small story at a time',
      'Personal',
      'ink',
      'You do not have to be an expert to share something useful. Sometimes a fresh perspective is exactly what someone needs.',
      '## Begin where you are\n\nWrite about a problem you solved this week. Explain a concept in your own words. Share a question you are still exploring.\n\nA story does not have to be definitive to be useful. It only has to be thoughtful and honest about what you know.\n\n## Invite a conversation\n\nLeave room for other perspectives. Ask a question at the end. Notice what readers connect to.\n\nThe habit of sharing can sharpen the habit of learning. And sometimes it introduces you to someone who is asking the same questions.',
    ],
  ].map(([title, tag, coverTheme, summary, body], i) => ({
    _id: 'sample-story-' + i,
    title,
    body,
    summary,
    tags: [tag],
    coverTheme,
    status: 'published',
    createdBy: { _id: 'demo', fullName: 'Curious mind' },
    createdAt: timestamp,
    updatedAt: timestamp,
    publishedAt: timestamp,
    readingMinutes: 2,
    __v: 0,
  })),
};
function read() {
  try {
    return JSON.parse(localStorage.getItem('second-brain-sample-v2')) || structuredClone(seed);
  } catch {
    return structuredClone(seed);
  }
}
function save(data) {
  localStorage.setItem('second-brain-sample-v2', JSON.stringify(data));
}
const id = () => crypto.randomUUID();
export async function demoRequest(path, { method = 'GET', body = {} } = {}) {
  const db = read(),
    parts = path.split('/').filter(Boolean);
  if (path === '/auth/me')
    return { user: { _id: 'demo', fullName: 'Curious mind', email: 'Sample workspace' } };
  if (path === '/auth/logout') {
    sessionStorage.removeItem('second-brain-demo');
    return { ok: true };
  }
  if (path === '/status')
    return { ready: false, demo: true, message: 'Sample workspace · local excerpts, no AI calls' };
  if (path === '/projects') {
    if (method === 'GET') return db.projects;
    const p = { ...body, _id: id() };
    db.projects.unshift(p);
    save(db);
    return p;
  }
  if (path === '/documents') return db.documents;
  if (path === '/documents/note') {
    const d = {
      ...body,
      _id: id(),
      kind: 'note',
      status: 'ready',
      chunks: 1,
      createdAt: new Date().toISOString(),
    };
    db.documents.unshift(d);
    save(db);
    return d;
  }
  if (path === '/documents/upload') {
    const file = body.get('file');
    if (file.name.endsWith('.pdf'))
      throw new Error(
        'Sign in to process PDFs with the knowledge service. You can try text or Markdown files here.',
      );
    if (file.size > 200000) throw new Error('Use a sample text file under 200 KB.');
    const d = {
      _id: id(),
      title: file.name,
      content: await file.text(),
      kind: 'text',
      tags: [],
      project: body.get('project') || null,
      status: 'ready',
      chunks: 1,
      createdAt: new Date().toISOString(),
    };
    db.documents.unshift(d);
    save(db);
    return d;
  }
  if (parts[0] === 'documents' && parts[1]) {
    const doc = db.documents.find((d) => d._id === parts[1]);
    if (!doc) throw new Error('Document not found.');
    if (method === 'DELETE') {
      db.documents = db.documents.filter((d) => d._id !== parts[1]);
      save(db);
      return { ok: true };
    }
    return doc;
  }
  if (path === '/search' || path === '/ask') {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const terms = (body.query || body.question)
      .toLowerCase()
      .split(/\W+/)
      .filter(
        (t) => t.length >= 2 && !['what', 'is', 'my', 'the', 'about', 'have', 'with'].includes(t),
      );
    const sources = db.documents
      .filter((d) => !body.project || d.project === body.project)
      .map((d) => ({
        d,
        score: terms.reduce(
          (n, t) => n + Number((d.title + d.content).toLowerCase().includes(t)),
          0,
        ),
      }))
      .filter((x) => x.score)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ d }, i) => ({
        documentId: d._id,
        title: d.title,
        excerpt: d.content,
        citation: i + 1,
        lineStart: 1,
        lineEnd: 1,
      }));
    if (path === '/search') return { sources };
    const answer = sources.length
      ? 'Here’s a passage from your sample library that connects to your question:\n\n> ' +
        sources[0].excerpt +
        ' [1]\n\n*This is a local excerpt preview. Sign in with a configured AI service for generated, grounded answers.*'
      : 'I couldn’t find a matching passage in this sample library. Try asking about RAG, the blog project, or authentication.';
    let c = db.conversations.find((c) => c._id === body.conversationId);
    if (!c) {
      c = { _id: id(), title: body.question.slice(0, 80), messages: [], project: body.project };
      db.conversations.unshift(c);
    }
    c.messages.push(
      { role: 'user', content: body.question },
      { role: 'assistant', content: answer, sources },
    );
    c.updatedAt = new Date().toISOString();
    save(db);
    return c;
  }
  if (path === '/conversations') return db.conversations;
  if (parts[0] === 'conversations') {
    if (method === 'DELETE') {
      db.conversations = db.conversations.filter((c) => c._id !== parts[1]);
      save(db);
      return { ok: true };
    }
    return db.conversations.find((c) => c._id === parts[1]);
  }
  const url = new URL(path, 'http://sample.local');
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments[0] === 'public' && segments[1] === 'blogs') {
    if (segments[3] === 'comments') return db.comments.filter((c) => c.blog === segments[2]);
    if (segments[2]) {
      const post = db.blogs.find((b) => b._id === segments[2] && b.status === 'published');
      if (!post) throw new Error('Story not found.');
      return post;
    }
    const q = (url.searchParams.get('q') || '').toLowerCase(),
      tag = url.searchParams.get('tag');
    const posts = db.blogs.filter(
      (b) =>
        b.status === 'published' &&
        (!tag || b.tags.includes(tag)) &&
        (!q || (b.title + b.summary).toLowerCase().includes(q)),
    );
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    return {
      posts: posts.slice((page - 1) * 9, page * 9),
      total: posts.length,
      pages: Math.ceil(posts.length / 9),
      page,
    };
  }
  if (parts[0] === 'blogs') {
    const post = db.blogs.find((b) => b._id === parts[1]);
    if (parts[2] === 'comments') {
      if (method === 'DELETE') db.comments = db.comments.filter((c) => c._id !== parts[3]);
      else {
        const comment = {
          _id: id(),
          blog: parts[1],
          content: body.content,
          createdBy: { _id: 'demo', fullName: 'Curious mind' },
          createdAt: new Date().toISOString(),
        };
        db.comments.unshift(comment);
        save(db);
        return comment;
      }
      save(db);
      return { ok: true };
    }
    if (method === 'GET') {
      if (!parts[1]) return db.blogs;
      if (!post) throw new Error('Story not found.');
      return post;
    }
    if (parts[2] === 'import')
      return demoRequest('/documents/note', {
        method: 'POST',
        body: { title: post.title, content: post.body, tags: ['blog'] },
      });
    if (method === 'DELETE') {
      db.blogs = db.blogs.filter((b) => b._id !== parts[1]);
      save(db);
      return { ok: true };
    }
    const now = new Date().toISOString();
    if (method === 'PUT') {
      if (!post) throw new Error('Story not found.');
      if (body.version !== post.__v)
        throw new Error('A newer version exists. Reload before saving.');
      Object.assign(post, body, {
        __v: post.__v + 1,
        updatedAt: now,
        publishedAt: body.status === 'published' ? post.publishedAt || now : post.publishedAt,
      });
      save(db);
      return post;
    }
    const created = {
      ...body,
      _id: id(),
      __v: 0,
      createdBy: { _id: 'demo', fullName: 'Curious mind' },
      readingMinutes: 1,
      createdAt: now,
      updatedAt: now,
      publishedAt: body.status === 'published' ? now : null,
    };
    db.blogs.unshift(created);
    save(db);
    return created;
  }
  if (path === '/chat/rooms') return [];
  if (path.startsWith('/chat/users')) return [];
  throw new Error('Sign in to use this feature with your own account.');
}
