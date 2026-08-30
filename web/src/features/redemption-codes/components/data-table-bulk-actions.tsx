/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import type { Table } from '@tanstack/react-table'
import { Download } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { CopyButton } from '@/components/copy-button'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { REDEMPTION_STATUS } from '../constants'
import { downloadTextFile, getDateStamp, isRedemptionExpired } from '../lib'
import type { Redemption } from '../types'

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>
}

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const { t } = useTranslation()
  const selectedRows = table.getSelectedRowModel().rows

  const contentToCopy = useMemo(() => {
    const selectedCodes = selectedRows.map((row) => {
      const redemption = row.original as Redemption
      return `${redemption.name}\t${redemption.key}`
    })
    return selectedCodes.join('\n')
  }, [selectedRows])

  // Only unused codes are exportable for sale; used/disabled/expired are skipped
  const selectedUnusedCodes = useMemo(
    () =>
      selectedRows
        .map((row) => row.original as Redemption)
        .filter(
          (redemption) =>
            redemption.status === REDEMPTION_STATUS.ENABLED &&
            !isRedemptionExpired(redemption.expired_time, redemption.status)
        ),
    [selectedRows]
  )

  const handleExportSelected = () => {
    if (selectedUnusedCodes.length === 0) {
      toast.error(t('No unused codes in selection'))
      return
    }
    downloadTextFile(
      `redemption-${getDateStamp()}.txt`,
      `${selectedUnusedCodes.map((redemption) => redemption.key).join('\n')}\n`
    )
    toast.success(
      t('Successfully exported {{count}} redemption codes', {
        count: selectedUnusedCodes.length,
      })
    )
  }

  return (
    <BulkActionsToolbar table={table} entityName={t('redemption code')}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant='outline'
              size='icon'
              className='size-8'
              onClick={handleExportSelected}
              aria-label={t('Export Selected TXT')}
            />
          }
        >
          <Download className='h-4 w-4' />
          <span className='sr-only'>{t('Export Selected TXT')}</span>
        </TooltipTrigger>
        <TooltipContent>{t('Export Selected TXT')}</TooltipContent>
      </Tooltip>
      <CopyButton
        value={contentToCopy}
        variant='outline'
        size='icon'
        className='size-8'
        tooltip={t('Copy selected codes')}
        successTooltip={t('Codes copied!')}
        aria-label={t('Copy selected codes')}
      />
    </BulkActionsToolbar>
  )
}
