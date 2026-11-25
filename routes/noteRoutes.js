const express = require('express');
const mongoose = require('mongoose');
const Note = require('../models/Note');
const appEvents = require('../events/appEvents');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// POST /api/notes
router.post('/', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: 'title and content are required' });
    }

    const note = await Note.create({
      title,
      content,
      owner: req.user._id,
    });

    appEvents.emit('note:created', note);

    return res.status(201).json(note);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create note', error: err.message });
  }
});

// GET /api/notes
router.get('/', async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { owner: req.user._id };
    const notes = await Note.find(filter).sort({ createdAt: 1 });
    return res.status(200).json(notes);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch notes', error: err.message });
  }
});

// GET /api/notes/:id
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid note ID' });
    }

    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view this note' });
    }

    return res.status(200).json(note);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch note', error: err.message });
  }
});

// PUT /api/notes/:id
router.put('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid note ID' });
    }

    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this note' });
    }

    if (req.body.title !== undefined) note.title = req.body.title;
    if (req.body.content !== undefined) note.content = req.body.content;

    const updated = await note.save();
    appEvents.emit('note:updated', updated);

    return res.status(200).json(updated);
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update note', error: err.message });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid note ID' });
    }

    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }

    if (note.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this note' });
    }

    await note.deleteOne();
    appEvents.emit('note:deleted', note._id, req.user._id);

    return res.status(200).json({ message: 'Note deleted', id: note._id });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete note', error: err.message });
  }
});

module.exports = router;