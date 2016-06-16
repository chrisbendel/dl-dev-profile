<?php
namespace Daftswag\Commands;

use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;

class Releases extends Command
{
    const OPT_LIMIT = 'number';

    protected function configure()
    {
        $this
            ->setDescription('List Git releases.')
            ->addOption(static::OPT_LIMIT, 'n', InputOption::VALUE_OPTIONAL, 'The number of results returned', 5);
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $output->writeln(shell_exec(implode(' | ', [
            'git tag',
            'xargs -I@ git log --format=format:"%ai @%n" -1 @',
            'sort -r',
            "awk '{print $4}'",
            "head -n {$input->getOption(static::OPT_LIMIT)}"
        ])));
    }
}
