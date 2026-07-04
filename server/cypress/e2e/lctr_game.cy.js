describe('LCTR Game E2E Tests', () => {
    it('should load the page and allow a game to start', () => {
      // Visit the local URL where your game is served
      cy.visit('http://localhost:3001/lctr_page.html'); // Ensure this is the correct URL for your frontend
  
      // Find the "new game" button and click it
      cy.get('#new-game-btn').click();
  
      // Find the "start game" button in the modal and click it
      cy.get('#start-game-btn').click();
  
      // After starting, check that the board area exists and is visible
      cy.get('#board-area').should('be.visible');
    });

    // Add this new 'it' block inside the 'describe' block
    it('should allow a player to make a move and update the board', () => {
    // We can reuse the setup from the first test
    cy.visit('http://localhost:3001/lctr_page.html');
    cy.get('#new-game-btn').click();
    cy.get('#start-game-btn').click();
  
    // The initial board should have tiles. We'll find one.
    // The default board starts with 5 rows. Let's check a tile in the second row.
    cy.get('#tile-1-0').should('exist');
  
    // Click on the board area to make the first move (remove top row)
    // Note: The coordinates might need to be adjusted for your specific layout
    cy.get('#board-area').click(150, 25); 
  
    // After the move, the tile from the original second row should now be gone
    // because it has become the new top row and was removed.
    // Or, more simply, we can check that a tile from the *original* top row is gone.
    cy.get('#tile-0-4').should('not.exist');
  });
});
