import * as core from '@actions/core'
import { GoogleAuth } from 'google-auth-library'
import { google } from 'googleapis'
import { JWTInput } from 'google-auth-library/build/src/auth/credentials'

const INPUT_CREDENTIALS = 'credentials'
const INPUT_TEMPLATE_SPREADSHEET_ID = 'templateSpreadsheetId'
const INPUT_TARGET_DRIVE_ID = 'targetDriveId'
const INPUT_COLUMN_START_LETTER = 'columnStartLetter'
const INPUT_TARGET_SPREADSHEET_NAME = 'targetSpreadsheetName'
const INPUT_DATA = 'data'

const OUTPUT_SPREADSHEET_ID = 'spreadsheetId'

type Data = string[][]

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const credentials: JWTInput = JSON.parse(core.getInput(INPUT_CREDENTIALS))
  const templateSpreadsheetId: string = core.getInput(
    INPUT_TEMPLATE_SPREADSHEET_ID
  )
  const targetDriveId: string = core.getInput(INPUT_TARGET_DRIVE_ID)
  const columnStartLetter: string = core.getInput(INPUT_COLUMN_START_LETTER)
  const spreadsheetName: string = core.getInput(INPUT_TARGET_SPREADSHEET_NAME)
  const data: Data = JSON.parse(core.getInput(INPUT_DATA))

  const auth = new GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive'
    ]
  })

  const sheetApi = google.sheets({ version: 'v4', auth })
  const driveApi = google.drive({ version: 'v3', auth })

  const fileResponse = await driveApi.files.copy({
    fileId: templateSpreadsheetId,
    supportsAllDrives: true,
    requestBody: {
      driveId: targetDriveId,
      name: spreadsheetName
    }
  })

  if (fileResponse.data.id == null) {
    return core.setFailed('File copy failed')
  }

  const targetSpreadsheetId = fileResponse.data.id
  core.setOutput(OUTPUT_SPREADSHEET_ID, targetSpreadsheetId)

  const spreadsheetResponse = await sheetApi.spreadsheets.get({
    spreadsheetId: targetSpreadsheetId
  })

  const targetSheet = spreadsheetResponse.data.sheets?.[0]

  if (targetSheet === undefined) {
    return core.setFailed('Spreadsheet read failed')
  }

  const range = `${targetSheet.properties?.title}!${columnStartLetter}${targetSheet.properties?.gridProperties?.rowCount}`
  sheetApi.spreadsheets.values.update({
    spreadsheetId: targetSpreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      majorDimension: 'ROWS',
      values: data
    }
  })
}
