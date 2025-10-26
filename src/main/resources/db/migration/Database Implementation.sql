CREATE TABLE Customer (
                          Customer_ID INT IDENTITY(1,1) PRIMARY KEY,
                          Email VARCHAR(255) UNIQUE NOT NULL,
                          Password VARCHAR(255) NOT NULL,  -- IMPORTANT: Hash passwords (e.g., using bcrypt) in your application! Do not store plain text.
                          First_name VARCHAR(100),
                          Last_name VARCHAR(100),
                          Phone VARCHAR(20),
                          Address VARCHAR(255),
                          Role VARCHAR(50)
);
GO


CREATE TABLE Staff (
                       Staff_ID INT IDENTITY(1,1) PRIMARY KEY,
                       First_name VARCHAR(100),
                       Last_name VARCHAR(100),
                       Password VARCHAR(255) NOT NULL,  -- Hash passwords!
                       Email VARCHAR(255) UNIQUE NOT NULL,
                       Role VARCHAR(50)
);
GO

CREATE TABLE Orders (
                        OrderID INT IDENTITY(1,1) PRIMARY KEY,
                        Date DATETIME NOT NULL,
                        Customer_ID INT NOT NULL,
                        Customer_name VARCHAR(200),  -- Consider removing (redundant with Customer table; join instead)
                        Address VARCHAR(255), -- Consider removing (redundant)
                        items VARCHAR(MAX),
    Service_Type VARCHAR(255),
    Sub_total DECIMAL(10,2) NOT NULL,
    Tax DECIMAL(10,2) NOT NULL,
    Total DECIMAL(10,2) NOT NULL,  -- Could be calculated as Sub_total + Tax
    Payment_ID INT,
    Special_Instruction TEXT,
    Status VARCHAR(50) NOT NULL,  -- E.g., 'pending', 'shipped'
    Staff_ID INT,
    CONSTRAINT FK_Orders_Customer FOREIGN KEY (Customer_ID) REFERENCES Customer(Customer_ID) ON DELETE CASCADE,
    CONSTRAINT FK_Orders_Staff FOREIGN KEY (Staff_ID) REFERENCES Staff(Staff_ID) ON DELETE SET NULL
);
GO


CREATE TABLE Payment (
                         Payment_ID INT IDENTITY(1,1) PRIMARY KEY,
                         Order_ID INT NOT NULL,
                         Customer_ID INT NOT NULL,
                         Amount DECIMAL(10,2) NOT NULL,
                         Payment_Method VARCHAR(50) NOT NULL,  -- Renamed from P_method for clarity (e.g., 'credit_card')
                         CONSTRAINT FK_Payment_Customer FOREIGN KEY (Customer_ID) REFERENCES Customer(Customer_ID) ON DELETE NO ACTION,  -- Changed to NO ACTION to avoid cascade cycle
                         CONSTRAINT FK_Payment_Orders FOREIGN KEY (Order_ID) REFERENCES Orders(OrderID) ON DELETE NO ACTION  -- Changed to NO ACTION to avoid cascade cycle with Orders
);
GO

ALTER TABLE Orders
    ADD CONSTRAINT FK_Orders_Payment FOREIGN KEY (Payment_ID) REFERENCES Payment(Payment_ID) ON DELETE NO ACTION;  -- Changed to NO ACTION to avoid cascade cycle with Payment
GO


CREATE TABLE Available_Jobs (
                                JobID INT IDENTITY(1,1) PRIMARY KEY,
                                Job_Title VARCHAR(255) NOT NULL,
                                Employment_Type VARCHAR(60),
                                Department VARCHAR(100),
                                Job_Description VARCHAR(max),
    Location VARCHAR(100),
    Posted_Date DATETIME NOT NULL  CONSTRAINT DF_Available_Jobs_Posted_Date DEFAULT (GETDATE()),
    Expires_At DATETIME,
    Is_Active BIT NOT NULL CONSTRAINT DF_Available_Jobs_Is_Active DEFAULT (1),

    CONSTRAINT CK_Available_Jobs_Employment_Type CHECK (
        Employment_Type IS NULL OR
        Employment_Type IN ('Temporary', 'Internship', 'Contract', 'Part-Time', 'Full-Time')
    )
);
GO

CREATE TABLE Applied_Jobs (
                              applied_jobiD INT IDENTITY(1,1) PRIMARY KEY,
                              JobID INT NOT NULL,
                              Customer_ID INT NOT NULL,
                              Applied_Date DATETIME NOT NULL CONSTRAINT DF_Applied_Jobs_Applied_Date DEFAULT (GETDATE()),
                              Status VARCHAR(20) NOT NULL CONSTRAINT DF_Applied_Jobs_Status DEFAULT ('new'),

                              CONSTRAINT FK_Applied_Jobs_Customer FOREIGN KEY (Customer_ID) REFERENCES Customer(Customer_ID) ON DELETE NO ACTION,
                              CONSTRAINT FK_Applied_Jobs_Job FOREIGN KEY (JobID) REFERENCES Available_Jobs(JobID) ON DELETE NO ACTION,
                              CONSTRAINT UQ_Applied_Jobs_Customer_Job UNIQUE (Customer_ID, JobID),
                              CONSTRAINT CK_Applied_Jobs_Status CHECK (Status IN ('rejected', 'accepted', 'reviewed', 'new')),

);
GO

CREATE TABLE Review (
                        Review_ID INT IDENTITY(1,1) PRIMARY KEY,  -- Added PK for uniqueness
                        Customer_ID INT NOT NULL,
                        Description TEXT,
                        Rating INT CHECK (Rating >= 1 AND Rating <= 5),
                        Service_Rating INT CHECK (Service_Rating >= 1 AND Service_Rating <= 5),
                        Platform_Rating INT CHECK (Platform_Rating >= 1 AND Platform_Rating <= 5),
                        Service_Description NVARCHAR(500),
                        Platform_Description NVARCHAR(500),
                        Created_At DATETIME2(0) NOT NULL CONSTRAINT DF_Review_Created_At DEFAULT (GETDATE()),

                        CONSTRAINT FK_Review_Customer FOREIGN KEY (Customer_ID) REFERENCES Customer(Customer_ID) ON DELETE CASCADE

);
GO

CREATE TABLE Report (
                        Report_ID INT IDENTITY(1,1) PRIMARY KEY,
                        Completed_Order_Count INT NOT NULL,  -- Renamed from Completed_Orders for clarity (assuming it's a count)
                        Total_Customers INT NOT NULL,
                        Total_Income DECIMAL(15,2) NOT NULL,
    -- Suggested additions (uncomment if needed):
    -- Report_Date DATETIME DEFAULT GETDATE(),
    -- Period_Start DATE,
    -- Period_End DATE
);
GO
insert into Staff values ('Admin','Manager',123456789,'admin@gmail.com','Admin');


CREATE TABLE Notifications (
                               NotificationID INT IDENTITY(1,1) PRIMARY KEY,
                               Message VARCHAR(255) NOT NULL,
                               Type VARCHAR(50) NOT NULL,
                               Entity_ID INT NULL,
                               Entity_Type VARCHAR(50) NULL,
                               Staff_ID INT NULL,
                               Is_Read BIT NOT NULL DEFAULT 0,
                               Created_At DATETIME2 NOT NULL DEFAULT GETDATE(),
                               Read_At DATETIME2 NULL
);

-- Create index for faster notification queries
CREATE INDEX idx_notification_staff ON Notifications (Staff_ID, Is_Read, Created_At);
CREATE INDEX idx_notification_entity ON Notifications (Entity_Type, Entity_ID);


-- Add Customer_ID column to Notifications for customer-targeted notifications
IF COL_LENGTH('dbo.Notifications', 'Customer_ID') IS NULL
BEGIN
ALTER TABLE dbo.Notifications ADD Customer_ID INT NULL;
CREATE INDEX IX_Notifications_Customer_ID ON dbo.Notifications(Customer_ID);
END;


-- Create Tax_Settings table to store a single configurable tax rate
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Tax_Settings]') AND type in (N'U'))
BEGIN
CREATE TABLE [dbo].[Tax_Settings] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
    [Rate] DECIMAL(5,4) NOT NULL CONSTRAINT DF_Tax_Settings_Rate DEFAULT (0.0800)
    );
END

-- Seed a single row if table is empty
IF NOT EXISTS (SELECT 1 FROM [dbo].[Tax_Settings])
BEGIN
INSERT INTO [dbo].[Tax_Settings] ([Rate]) VALUES (0.0800);
END

