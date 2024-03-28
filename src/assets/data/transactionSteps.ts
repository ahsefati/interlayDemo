const transactionStepsData = [
    {
        "title": "Pending Approval",
        "description": "You should get a notification from your wallet asking for your approval. To continue the transfer, please approve the transaction first."
    },
    {
        "title": "Paying Network Fee",
        "description": "Before finalizing the transfer, network fee is being paid to the chain validators."
    },
    {
        "title": "Withdrawing the Amount",
        "description": "The amount to be sent to the mentioned address is being withdrawn from your wallet.",
        "onError": "Not enough balance in your account. Please try again with a lower amount."
    },
    {
        "title": "Transfering the Amount",
        "description": "The transfer process in the chain has been started."
    },
    {
        "title": "Depositing the Amount",
        "description": "The amount is being processed to be deposited."
    },
    {
        "title": "Finalized",
        "description": "Congrats! Your transaction is completed!"
    }
]

export default transactionStepsData;