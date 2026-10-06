const express = require('express');
const router = express.Router();
const Item = require('../models/Item');

// POST /api/items - Create a new item
router.post('/items', async (req, res) => {
  try {
    const { name, description, price, inStock } = req.body;
    const newItem = new Item({
      name,
      description,
      price: Number(price),
      inStock: inStock !== undefined ? inStock : true
    });

    const savedItem = await newItem.save();
    return res.status(201).json(savedItem);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'Server error while creating item' });
  }
});

// GET /api/items - Get all items
router.get('/items', async (req, res) => {
  try {
    const items = await Item.find().sort({ createdAt: -1 });
    return res.status(200).json(items);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error while fetching items' });
  }
});

// GET /api/items/:id - Get a single item
router.get('/items/:id', async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    return res.status(200).json(item);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid Item ID format' });
    }
    return res.status(500).json({ error: error.message || 'Server error while fetching item' });
  }
});

// PUT /api/items/:id - Update an item
router.put('/items/:id', async (req, res) => {
  try {
    const { name, description, price, inStock } = req.body;
    const updateData = {
      name,
      description,
      price: Number(price),
      inStock: inStock !== undefined ? inStock : true
    };

    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedItem) {
      return res.status(404).json({ error: 'Item not found' });
    }

    return res.status(200).json(updatedItem);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid Item ID format' });
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: error.message || 'Server error while updating item' });
  }
});

// DELETE /api/items/:id - Delete an item
router.delete('/items/:id', async (req, res) => {
  try {
    const deletedItem = await Item.findByIdAndDelete(req.params.id);
    if (!deletedItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    return res.status(200).json({
      message: 'Item deleted successfully',
      item: deletedItem
    });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Invalid Item ID format' });
    }
    return res.status(500).json({ error: error.message || 'Server error while deleting item' });
  }
});

module.exports = router;
