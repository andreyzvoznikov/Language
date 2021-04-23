// import { Schema, model } from 'mongoose';
const { Schema, model } = require('mongoose');
const wordSchema = new Schema(
  {
    name: String,
    about: String,
    example: String,
    url: String,
    requests: Number,
    number: Number,
    users: [],
  },
  {
    timestamps: true,
  }
);

const Word = model('Word', wordSchema);
module.exports = Word;
