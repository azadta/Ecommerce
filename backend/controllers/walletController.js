

const Wallet = require('../models/walletModel');



exports.getWallet = async (req, res, next) => {
    try {
        const wallet = await Wallet.findOne({ user: req.user._id })

        if (!wallet) {
            return res.status(404).json({ message: 'Wallet not found' });
        }

        res.render('wallet', { wallet });
    } catch (error) {
        next(error);
    }
};






exports.creditWallet = async (userId, amount, description) => {
    try {
        if (amount <= 0) {
            throw new Error('Amount must be a positive value');
        }

        let wallet = await Wallet.findOne({ user: userId });

        if (!wallet) {
            wallet = new Wallet({ user: userId, balance: 0, transactions: [] });
        }

        wallet.balance += amount;
        wallet.transactions.push({
            type: 'credit',
            amount,
            description: description || 'Refund for returned item',
            date: new Date(),
        });

        await wallet.save();

        return {
            success: true,
            message: 'Amount credited to wallet successfully',
            balance: wallet.balance,
            transactions: wallet.transactions
        };
    } catch (error) {
        throw error; // Handle this error in the calling function
    }
};





exports.debitWallet = async (req, res, next) => {
    try {
        const { amount, description } = req.body;

        let wallet = await Wallet.findOne({ user: req.user._id });

        if (!wallet || wallet.balance < amount) {
            return res.status(400).json({ message: 'Insufficient wallet balance' });
        }

        wallet.balance -= amount;
        wallet.transactions.push({
            type: 'debit',
            amount,
            description: description || 'Purchase using wallet balance',
        });

        await wallet.save();

        res.status(200).json({ message: 'Amount debited from wallet successfully' });
    } catch (error) {
        next(error);
    }
};


