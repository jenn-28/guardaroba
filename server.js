const path = require('path');
require("dotenv").config({path: path.resolve(__dirname, "./.env")});
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3000;
connectDB();