/* eslint-disable no-underscore-dangle */

const blogsRouter = require("express").Router();
const Blog = require("../models/blog");
const Comment = require("../models/comment");
const { userExtractor } = require("../utils/middleware");

blogsRouter.get("/", async (request, response) => {
  const blogs = await Blog.find({})
    .populate("user", { username: 1, name: 1 })
    .populate("comments");
  response.json(blogs);
});

blogsRouter.post("/", userExtractor, async (request, response) => {
  const { title, url, author, likes } = request.body;
  if (!title || !author) return response.status(400).end();

  const { user } = request;
  if (!user) {
    return response.status(401).json({ error: "operation not permitted" });
  }

  const blog = new Blog({
    title,
    author,
    url,
    likes: likes || 0,
    user,
  });

  const savedBlog = await blog.save();
  user.blogs = user.blogs.concat(savedBlog._id);
  await user.save();

  return response.status(201).json(savedBlog);
});

blogsRouter.put("/:id", userExtractor, async (request, response) => {
  const { title, author, url, likes } = request.body;
  if (!title || !author) return response.status(400).end();

  const { user } = request;
  if (!user) {
    return response.status(401).json({ error: "operation not permitted" });
  }

  const updatedContent = {
    title,
    author,
    url,
    likes,
  };

  const updatedBlog = await Blog.findByIdAndUpdate(
    request.params.id,
    updatedContent,
    { new: true, runValidators: true, context: "query" }
  );

  return response.json(updatedBlog);
});

blogsRouter.delete("/:id", userExtractor, async (request, response) => {
  const { user } = request;
  const blog = await Blog.findById(request.params.id);

  if (!user || user.id.toString() !== blog.user.toString()) {
    return response.status(401).json({ error: "operation not allowed" });
  }

  user.blogs = user.blogs.filter((b) => b.toString() !== blog.id.toString());
  await user.save();
  await blog.remove();

  return response.status(204).end();
});

blogsRouter.get("/:id/comments", async (request, response) => {
  const comments = await Comment.find({}).populate("blog");
  return response.status(201).json(comments);
});

blogsRouter.post("/:id/comments", async (request, response) => {
  const { content } = request.body;
  const blog = await Blog.findById(request.params.id);

  const comment = new Comment({
    content,
    blog,
  });
  const savedComment = await comment.save();

  blog.comments = blog.comments.concat(savedComment._id);
  await blog.save();

  return response.status(201).json(savedComment);
});

module.exports = blogsRouter;
